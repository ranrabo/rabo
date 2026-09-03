#!/usr/bin/env python3
"""Private roster-backed email helper for macOS Mail.app.

The roster and saved drafts live under the ignored ``private/`` directory.
Draft mode opens a reviewed message in Mail.app. Send mode sends through the
local Mail.app installation and requires an explicit confirmation flag.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
PRIVATE_DIR = ROOT / "private"
DEFAULT_ROSTER = PRIVATE_DIR / "roster.json"
DRAFT_DIR = PRIVATE_DIR / "drafts"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def fail(message: str) -> None:
    raise SystemExit(f"Error: {message}")


def secure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    try:
        path.chmod(0o700)
    except OSError:
        pass


def write_private_json(path: Path, payload: dict[str, Any]) -> None:
    secure_directory(path.parent)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(path)
    try:
        path.chmod(0o600)
    except OSError:
        pass


def roster_path(args: argparse.Namespace) -> Path:
    return Path(args.roster).expanduser() if args.roster else Path(os.environ.get("RABO_ROSTER_FILE", DEFAULT_ROSTER))


def load_roster(path: Path, allow_missing: bool = False) -> list[dict[str, str]]:
    if not path.exists():
        if allow_missing:
            return []
        fail(f"Roster not found at {path}. Run `python scripts/mail_team.py init` first.")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        fail(f"Roster is not valid JSON: {error}")
    members = data.get("members") if isinstance(data, dict) else None
    if not isinstance(members, list):
        fail("Roster must contain a `members` array.")

    result: list[dict[str, str]] = []
    seen: set[str] = set()
    for member in members:
        if not isinstance(member, dict):
            fail("Each roster member must be an object with `name` and `email`.")
        name = str(member.get("name", "")).strip()
        email = str(member.get("email", "")).strip().lower()
        if not name or not EMAIL_RE.fullmatch(email):
            fail(f"Invalid roster member: {member!r}")
        if email in seen:
            fail(f"Duplicate email address in roster: {email}")
        seen.add(email)
        result.append({"name": name, "email": email})
    return result


def save_roster(path: Path, members: list[dict[str, str]]) -> None:
    write_private_json(path, {"members": members})


def lookup_members(members: list[dict[str, str]], names: str) -> list[dict[str, str]]:
    wanted = [item.strip().casefold() for item in names.split(",") if item.strip()]
    by_name = {member["name"].casefold(): member for member in members}
    missing = [item for item in wanted if item not in by_name]
    if missing:
        fail(f"Roster member not found: {', '.join(missing)}")
    return [by_name[item] for item in wanted]


def select_members(members: list[dict[str, str]], names: str | None, select_all: bool) -> list[dict[str, str]]:
    if select_all and names:
        fail("Use either --members or --all, not both.")
    if select_all:
        selected = members
    elif names:
        selected = lookup_members(members, names)
    else:
        fail("Choose recipients with --members \"Name One,Name Two\" or --all.")
    if not selected:
        fail("No recipients selected.")
    return selected


def select_cc(members: list[dict[str, str]], names: str | None) -> list[dict[str, str]]:
    return lookup_members(members, names) if names else []


def message_body(args: argparse.Namespace) -> str:
    if bool(args.body) == bool(args.body_file):
        fail("Provide exactly one of --body or --body-file.")
    if args.body_file:
        path = Path(args.body_file).expanduser()
        if not path.is_file():
            fail(f"Body file not found: {path}")
        return path.read_text(encoding="utf-8")
    return args.body


def apple_string(value: str) -> str:
    # AppleScript strings use backslash escapes. Newlines become Mail body
    # carriage returns; quoting prevents message content from becoming code.
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    escaped = escaped.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\\r")
    return f'"{escaped}"'


def mail_script(subject: str, body: str, recipients: list[dict[str, str]], send: bool, cc: list[dict[str, str]] | None = None) -> str:
    recipient_lines = "\n".join(
        f"make new to recipient at end of to recipients with properties {{address:{apple_string(member['email'])}}}"
        for member in recipients
    )
    cc_lines = "\n".join(
        f"make new cc recipient at end of cc recipients with properties {{address:{apple_string(member['email'])}}}"
        for member in cc or []
    )
    action = "send newMessage" if send else "activate"
    return f'''tell application "Mail"
    set newMessage to make new outgoing message with properties {{subject:{apple_string(subject)}, content:{apple_string(body)}, visible:true}}
    tell newMessage
        {recipient_lines}
        {cc_lines}
    end tell
    {action}
end tell
'''


def open_in_mail(subject: str, body: str, recipients: list[dict[str, str]], send: bool, cc: list[dict[str, str]] | None = None) -> None:
    if sys.platform != "darwin":
        fail("Mail.app integration requires macOS.")
    try:
        result = subprocess.run(
            ["osascript", "-"],
            input=mail_script(subject, body, recipients, send, cc),
            text=True,
            capture_output=True,
            timeout=30,
            check=False,
        )
    except FileNotFoundError:
        fail("`osascript` was not found. Run this utility on macOS.")
    except subprocess.TimeoutExpired:
        fail("Mail.app did not respond within 30 seconds.")
    if result.returncode:
        detail = (result.stderr or result.stdout).strip()
        fail(f"Mail.app could not process the message. Check macOS Automation permissions. {detail}")


def draft_path(value: str) -> Path:
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = ROOT / path
    if path.suffix != ".json":
        fail("Draft files must use the .json extension.")
    return path


def save_draft(subject: str, body: str, recipients: list[dict[str, str]], status: str = "draft", path: Path | None = None, cc: list[dict[str, str]] | None = None) -> Path:
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "id": str(uuid.uuid4()),
        "status": status,
        "subject": subject,
        "body": body,
        "recipients": recipients,
        "cc": cc or [],
        "createdAt": now,
        "updatedAt": now,
    }
    target = path or DRAFT_DIR / f"{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:8]}.json"
    write_private_json(target, payload)
    return target


def load_draft(path: Path) -> dict[str, Any]:
    if not path.is_file():
        fail(f"Draft not found: {path}")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        fail(f"Draft is not valid JSON: {error}")
    if not isinstance(data, dict) or not data.get("subject") or not data.get("body") or not data.get("recipients"):
        fail("Draft must contain subject, body, and recipients.")
    return data


def command_init(args: argparse.Namespace) -> None:
    path = roster_path(args)
    if path.exists() and not args.force:
        fail(f"Roster already exists at {path}; use --force to replace it.")
    save_roster(path, [])
    secure_directory(DRAFT_DIR)
    print(f"Created private roster: {path}")
    print(f"Drafts will be saved under: {DRAFT_DIR}")


def command_list(args: argparse.Namespace) -> None:
    members = load_roster(roster_path(args))
    for member in members:
        print(f"{member['name']} <{member['email']}>")


def command_add(args: argparse.Namespace) -> None:
    path = roster_path(args)
    members = load_roster(path, allow_missing=True)
    email = args.email.strip().lower()
    if not args.name.strip() or not EMAIL_RE.fullmatch(email):
        fail("Provide a name and a valid email address.")
    if any(member["email"] == email for member in members):
        fail(f"Email already exists in roster: {email}")
    members.append({"name": args.name.strip(), "email": email})
    save_roster(path, members)
    print(f"Added {args.name.strip()} to the private roster.")


def command_remove(args: argparse.Namespace) -> None:
    path = roster_path(args)
    members = load_roster(path)
    wanted = args.name.casefold()
    remaining = [member for member in members if member["name"].casefold() != wanted]
    if len(remaining) == len(members):
        fail(f"Roster member not found: {args.name}")
    save_roster(path, remaining)
    print(f"Removed {args.name} from the private roster. Existing draft snapshots are unchanged.")


def command_compose(args: argparse.Namespace) -> None:
    members = load_roster(roster_path(args))
    recipients = select_members(members, args.members, args.all)
    cc = select_cc(members, args.cc)
    body = message_body(args)
    if args.send and not args.confirm_send:
        fail("Direct sending requires both --send and --confirm-send.")
    path = save_draft(args.subject, body, recipients, cc=cc)
    open_in_mail(args.subject, body, recipients, send=args.send, cc=cc)
    if args.send:
        draft = load_draft(path)
        draft["status"] = "sent"
        draft["updatedAt"] = datetime.now(timezone.utc).isoformat()
        write_private_json(path, draft)
    print(("Sent" if args.send else "Opened draft") + f" in Mail.app: {path}")


def command_open(args: argparse.Namespace) -> None:
    path = draft_path(args.draft)
    draft = load_draft(path)
    recipients = draft["recipients"]
    open_in_mail(str(draft["subject"]), str(draft["body"]), recipients, send=False, cc=draft.get("cc", []))
    print(f"Opened draft in Mail.app: {path}")


def command_send(args: argparse.Namespace) -> None:
    if not args.confirm_send:
        fail("Direct sending requires --confirm-send.")
    path = draft_path(args.draft)
    draft = load_draft(path)
    open_in_mail(str(draft["subject"]), str(draft["body"]), draft["recipients"], send=True, cc=draft.get("cc", []))
    draft["status"] = "sent"
    draft["updatedAt"] = datetime.now(timezone.utc).isoformat()
    write_private_json(path, draft)
    print(f"Sent draft through Mail.app: {path}")


def add_roster_arg(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--roster", help="Private roster JSON path (default: private/roster.json)")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manage a private roster and Mail.app drafts.")
    sub = parser.add_subparsers(dest="command", required=True)

    init = sub.add_parser("init", help="Create an empty private roster and drafts directory")
    add_roster_arg(init)
    init.add_argument("--force", action="store_true", help="Replace an existing roster")
    init.set_defaults(function=command_init)

    list_command = sub.add_parser("list", help="List the private roster")
    add_roster_arg(list_command)
    list_command.set_defaults(function=command_list)

    add = sub.add_parser("add", help="Add one member to the private roster")
    add_roster_arg(add)
    add.add_argument("--name", required=True)
    add.add_argument("--email", required=True)
    add.set_defaults(function=command_add)

    remove = sub.add_parser("remove", help="Remove one member from the private roster")
    add_roster_arg(remove)
    remove.add_argument("--name", required=True)
    remove.set_defaults(function=command_remove)

    compose = sub.add_parser("compose", help="Save a draft and open it in Mail.app")
    add_roster_arg(compose)
    compose.add_argument("--members", help="Comma-separated roster names")
    compose.add_argument("--all", action="store_true", help="Use every roster member")
    compose.add_argument("--cc", help="Comma-separated roster names to copy")
    compose.add_argument("--subject", required=True)
    compose.add_argument("--body")
    compose.add_argument("--body-file")
    compose.add_argument("--send", action="store_true", help="Send immediately through Mail.app")
    compose.add_argument("--confirm-send", action="store_true", help="Required with --send")
    compose.set_defaults(function=command_compose)

    open_command = sub.add_parser("open", help="Open a saved draft in Mail.app")
    open_command.add_argument("--draft", required=True)
    open_command.set_defaults(function=command_open)

    send = sub.add_parser("send", help="Send a saved draft through Mail.app")
    send.add_argument("--draft", required=True)
    send.add_argument("--confirm-send", action="store_true", help="Required to send")
    send.set_defaults(function=command_send)
    return parser


if __name__ == "__main__":
    try:
        parsed = build_parser().parse_args()
        parsed.function(parsed)
    except KeyboardInterrupt:
        fail("Cancelled.")
