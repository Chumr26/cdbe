# Fix for emoji display in PowerShell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$BackendPath = "./be"
$FrontendPath = "./fe"

Write-Host "Starting Backend and Frontend development servers..." -ForegroundColor Cyan

# Start-Process: Launches a new process (in this case, a new PowerShell window)
# -ArgumentList: Passes specific parameters to the new process
# -NoExit: PowerShell flag that prevents the window from closing after the command finishes
# -Command: Executes the string that follows as a PowerShell script block
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Backend...'; cd $BackendPath; npm run dev"

# Repeat the process for the Frontend server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Frontend...'; cd $FrontendPath; npm run dev"

Write-Host "Processes initiated." -ForegroundColor Green
