$folderPath = "C:\Users\Vanillaaaa\Downloads\MajdataPlay-Alpha4.7.4-WithEdit-Release"
$files = Get-ChildItem -Recurse $folderPath

foreach ($file in $files) {
    if (!$file.DirectoryName) {
    } else {
        $relativePath = $file.DirectoryName.Insert($file.DirectoryName.Length,'\').Insert($file.DirectoryName.Length+1, $file.Name).Remove(0,$folderPath.Length)
        wrangler r2 object put "majdataplay-distrib/Stable/$relativePath" --file $file.FullName --remote
    }
}
