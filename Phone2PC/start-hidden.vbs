' ============================================================
'  手机输入到笔记本 - 开机静默启动
'  双击运行：将此文件复制到 Windows 启动文件夹即可开机自启
'  启动文件夹路径：%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
' ============================================================
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "node server.js", 0, False
