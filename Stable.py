from concurrent.futures import ThreadPoolExecutor, as_completed
import os
from pathlib import Path
import subprocess

## 使用前请先wrangler login

def upload_file(file_path, folder_path):
    relative_path = file_path.relative_to(folder_path)
    r2_destination = f"majdataplay-distrib/Stable/{relative_path}"
    command = [
        r"C:\Users\Vanillaaaa\AppData\Roaming\npm\wrangler.cmd",
        "r2",
        "object",
        "put",
        r2_destination,
        "--file",
        str(file_path),
        "--remote"
    ]
    subprocess.run(command, check=True)
    return str(file_path)

def main():
    folder_path = r"C:\Users\Vanillaaaa\Downloads\MajdataPlay-Alpha4.7.28-Release"
    files = []
    
    # 收集所有文件路径
    for root, dirs, filenames in os.walk(folder_path):
        for filename in filenames:
            files.append(Path(root) / filename)
    
    files_count = len(files)
    failed_files = []
    success_count = 0
    
    with ThreadPoolExecutor(max_workers=min(32, (os.cpu_count() or 1) * 5)) as executor:
        print(f"开了 {executor._max_workers} 个线程")
        future_to_file = {}
        for file_path in files:
            future = executor.submit(upload_file, file_path, folder_path)
            future_to_file[future] = str(file_path)
        
        for future in as_completed(future_to_file):
            file_path = future_to_file[future]
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