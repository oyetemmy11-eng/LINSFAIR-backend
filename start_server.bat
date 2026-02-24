@echo off
echo Starting server at %TIME% > server_log_v2.txt
"C:\Program Files\nodejs\node.exe" server.js >> server_log_v2.txt 2>&1
echo Server process ended at %TIME% >> server_log_v2.txt
