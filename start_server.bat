@echo off
echo Starting server at %TIME% > server_log.txt
"C:\Program Files\nodejs\node.exe" server.js >> server_log.txt 2>&1
echo Server process ended at %TIME% >> server_log.txt
