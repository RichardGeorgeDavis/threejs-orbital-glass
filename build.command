#!/bin/sh
set -eu

script_path=$0

while [ -L "$script_path" ]; do
  script_dir=$(CDPATH= cd -- "$(dirname "$script_path")" && pwd)
  script_path=$(readlink "$script_path")
  case "$script_path" in
    /*) ;;
    *) script_path="$script_dir/$script_path" ;;
  esac
done

repo_root=$(CDPATH= cd -- "$(dirname "$script_path")" && pwd)

cd "$repo_root"
exec pnpm build
