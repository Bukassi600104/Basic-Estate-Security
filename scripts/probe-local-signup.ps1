param(
  [string]$BaseUrl = "http://localhost:3000"
)

$uri = "$BaseUrl/api/auth/sign-up"
$email = "localprobe+" + (Get-Date -Format "yyyyMMddHHmmss") + "@example.com"
$body = @{
  estateName    = "Local Probe Estate"
  estateAddress = "1 Local Street"
  adminName     = "Local Admin"
  email         = $email
  password      = "Str0ngPassw0rd"
} | ConvertTo-Json

$headers = @{
  Origin           = $BaseUrl
  "Sec-Fetch-Site" = "same-origin"
}

$resp = Invoke-WebRequest -Method Post -Uri $uri -Headers $headers -ContentType "application/json" -Body $body -SkipHttpErrorCheck
Write-Output ("STATUS {0} BODY {1}" -f $resp.StatusCode, $resp.Content)
