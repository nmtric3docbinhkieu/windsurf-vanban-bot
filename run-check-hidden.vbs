' run-check-hidden.vbs
' Chay run-check.bat an trong nen (khong hien cua so den)
Dim fso, scriptDir, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
cmd = "cmd /c """ & scriptDir & "\run-check.bat"""
CreateObject("WScript.Shell").Run cmd, 0, False
