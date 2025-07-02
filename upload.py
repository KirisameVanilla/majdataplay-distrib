import json
from os import path
import subprocess
from threading import Lock
import time
from typing import Any
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import os


# 使用前先wrangler login, 然后设置下面的base_folder

base_folder = r"E:\KirisameVanilla\Documents\Tencent Files\1147465926\FileRecv\MajdataPlay-0.1.0-rc6-Release\MajdataPlay-0.1.0-rc6-Release"


def fetch_assets_info(op_type: str) -> list[dict]:
    response = requests.get(f"https://majdataplay.work/{op_type}.json")
    return json.loads(response.text)


def read_assets_info(op_type: str) -> list[dict]:
    with open(path.join(base_folder, f"{op_type}.json"), "r", encoding="utf-8") as f:
        content = f.read()
        return json.loads(content)


def check_update(op_type: str) -> list[dict]:
    remote_assets_info: list[dict] = fetch_assets_info(op_type)
    local_assets_info: list[dict] = read_assets_info(op_type)
    need_update: list[dict] = []
    for asset_info in local_assets_info:
        if asset_info not in remote_assets_info:
            need_update.append(asset_info)
    return need_update


def upload_file(asset_info: dict, op_type: str) -> str:
    relative_path = asset_info["RelativePath"].lstrip("/\\")
    r2_destination = f"majdataplay-distrib/{op_type}/{relative_path}"
    full_local_path = path.normpath(path.join(base_folder, relative_path))
    command = [
        r"C:\Users\KirisameVanilla\AppData\Local\npm-cache\_npx\32026684e21afda6\node_modules\.bin\wrangler.cmd",
        "r2",
        "object",
        "put",
        r2_destination,
        "--file",
        full_local_path,
        "--remote",
    ]
    print(command)
    subprocess.run(command, check=True)
    return str(full_local_path)

UPLOADS_PER_SECOND = 5
last_upload_time = 0
upload_lock = Lock()

def rate_limited_submit(executor, func, *args):
    global last_upload_time
    with upload_lock:
        now = time.time()
        elapsed = now - last_upload_time
        wait_time = max(0, 1.0 / UPLOADS_PER_SECOND - elapsed)
        if wait_time > 0:
            time.sleep(wait_time)
        last_upload_time = time.time()
        return executor.submit(func, *args)


def main() -> None:
    op_code: str = input("请输入要上传的版本类型\n1: Nightly\n2: Stable\n")
    op_type = "Stable" if op_code == "2" else "Nightly"
    print("您选择了" + op_type)
    files: list[dict] = check_update(op_type)
    files_count: int = len(files)
    print("待更新: ", files_count)
    failed_files: list[str] = []
    success_count = 0

    with ThreadPoolExecutor(max_workers=min(32, (os.cpu_count() or 1) * 5)) as executor:
        print(f"开了 {executor._max_workers} 个线程")
        future_to_file: dict[Any, dict] = {}
        for file in files:
            future = rate_limited_submit(executor, upload_file, file, op_type)
            future_to_file[future] = file

        for future in as_completed(future_to_file):
            file_path: str = base_folder + future_to_file[future]["RelativePath"]
            try:
                _ = future.result()
                success_count += 1
                print(f"{success_count} / {files_count}")
            except Exception as e:
                print(f"❌ 上传失败 ({file_path}): {e}")
                failed_files.append(file_path)

    if failed_files:
        print("\n❌ 以下文件上传失败：")
        for file in failed_files:
            print(file)
    else:
        print("\n✅ 所有文件上传任务已完成！")


if __name__ == "__main__":
    main()
