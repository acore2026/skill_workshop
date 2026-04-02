#!/usr/bin/env python3
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if key and key not in os.environ:
            os.environ[key] = value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Small direct test client for the configured Kimi/Moonshot chat-completions API.",
    )
    parser.add_argument(
        "prompt",
        nargs="?",
        default="Say hello in one short sentence.",
        help="Prompt to send to the model.",
    )
    parser.add_argument(
        "--system",
        default="You are a concise assistant. Reply briefly.",
        help="Optional system prompt.",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Override the model name. Defaults to LLM_MODEL or kimi-k2.5.",
    )
    parser.add_argument(
        "--base-url",
        default=None,
        help="Override the API base URL. Defaults to LLM_BASE_URL or https://api.moonshot.cn/v1.",
    )
    return parser.parse_args()


def extract_delta_text(delta: Any) -> str:
    if isinstance(delta, str):
        return delta
    if isinstance(delta, list):
        parts: list[str] = []
        for item in delta:
            if isinstance(item, str):
                parts.append(item)
                continue
            if not isinstance(item, dict):
                continue
            item_type = item.get("type")
            if item_type in (None, "text"):
                text = item.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "".join(parts)
    if isinstance(delta, dict):
        if isinstance(delta.get("content"), str):
            return delta["content"]
        if isinstance(delta.get("text"), str):
            return delta["text"]
    return ""


def extract_reasoning_text(delta: Any) -> str:
    if not isinstance(delta, dict):
        return ""
    for key in ("reasoning_content", "reasoning", "thinking", "thinking_content"):
        text = extract_delta_text(delta.get(key))
        if text:
            return text
    return ""


def main() -> int:
    repo_root = Path(__file__).resolve().parents[2]
    load_env_file(repo_root / "backend" / ".env.backend")

    args = parse_args()
    api_key = os.environ.get("LLM_API_KEY", "").strip()
    base_url = (args.base_url or os.environ.get("LLM_BASE_URL") or "https://api.moonshot.cn/v1").rstrip("/")
    model = args.model or os.environ.get("LLM_MODEL") or "kimi-k2.5"

    if not api_key:
        print("Missing LLM_API_KEY. Set it in backend/.env.backend or the environment.", file=sys.stderr)
        return 1

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": args.system},
            {"role": "user", "content": args.prompt},
        ],
        "stream": True,
    }

    request = urllib.request.Request(
        url=f"{base_url}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            print(f"Streaming from {model} via {base_url}/chat/completions\n", file=sys.stderr)
            saw_stream = False
            saw_reasoning = False
            in_reasoning_block = False
            final_event = None
            for raw_line in response:
                line = raw_line.decode("utf-8", errors="replace").strip()
                if not line or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    event = json.loads(data)
                except json.JSONDecodeError:
                    print(data, file=sys.stderr)
                    continue

                final_event = event
                choices = event.get("choices") or []
                if not choices:
                    continue

                delta = choices[0].get("delta") or {}
                reasoning_text = extract_reasoning_text(delta)
                if reasoning_text:
                    if not in_reasoning_block:
                        if saw_stream:
                            print(file=sys.stderr)
                        print("--- thinking ---", file=sys.stderr)
                        in_reasoning_block = True
                    saw_reasoning = True
                    print(reasoning_text, end="", file=sys.stderr, flush=True)

                text = extract_delta_text(delta.get("content"))
                if not text:
                    text = extract_delta_text(delta)
                if text:
                    if in_reasoning_block:
                        print("\n--- answer ---", file=sys.stderr)
                        in_reasoning_block = False
                    saw_stream = True
                    print(text, end="", flush=True)
            if in_reasoning_block:
                print(file=sys.stderr)
            if saw_stream:
                print()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        print(f"HTTP {exc.code}", file=sys.stderr)
        print(detail, file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        return 1

    if final_event is not None and not saw_stream and not saw_reasoning:
        print(json.dumps(final_event, indent=2, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
