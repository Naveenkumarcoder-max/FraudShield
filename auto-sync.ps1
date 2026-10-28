
$ErrorActionPreference = "Continue"
$repo = "D:\FraudShield"

Set-Location $repo

$branch = git branch --show-current
if (-not $branch) {
    Write-Host "No Git branch found."
    exit 1
}

git remote get-url origin *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "GitHub remote 'origin' is missing."
    exit 1
}

Write-Host "FraudShield auto-sync is running. Press Ctrl+C to stop."

while ($true) {
    Start-Sleep -Seconds 15

    git add -A

    git diff --cached --quiet
    if ($LASTEXITCODE -eq 1) {
        $message = "Auto-sync: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        git commit -m $message

        if ($LASTEXITCODE -eq 0) {
            git push origin $branch
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Commit and push succeeded."
            } else {
                Write-Host "Push failed. Check authentication or remote changes."
            }
        }
    }
}
