from asyncio import Future
import json
from os import path
import subprocess
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import os


# 使用前先wrangler login, 然后设置下面的base_folder

base_folder = r"C:\Users\Vanillaaaa\Downloads\MajdataPlay-Alpha4.7.34-Release"


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
    r2_destination = f"majdataplay-distrib/{op_type}/{asset_info['RelativePath']}"
    print(base_folder)
    full_local_path = base_folder + asset_info["RelativePath"]
    command = [
        r"C:\Users\Vanillaaaa\AppData\Roaming\npm\wrangler.cmd",
        "r2",
        "object",
        "put",
        r2_destination,
        "--file",
        full_local_path,
        "--remote",
    ]
    subprocess.run(command, check=True)
    return str(full_local_path)


def main() -> None:
    op_code: str = input("请输入要上传的版本类型\n1: Nightly\n2: Stable\n")
    op_type = "Stable" if op_code == "2" else "Nightly"
    print("您选择了" + op_type)
    files: list[dict] = check_update(op_type)
    files_count: int = len(files)
    failed_files: list[str] = []
    success_count = 0

    with ThreadPoolExecutor(max_workers=min(32, (os.cpu_count() or 1) * 5)) as executor:
        print(f"开了 {executor._max_workers} 个线程")
        future_to_file: dict[Future[str], dict] = {}
        for file in files:
            future = executor.submit(upload_file, file, op_type)
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
