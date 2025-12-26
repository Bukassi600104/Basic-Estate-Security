param(
  [string]$BaseUrl = "https://main.d18ktaplzyr50v.amplifyapp.com"
)

$uri = "$BaseUrl/api/auth/sign-up"
$email = "probe+" + (Get-Date -Format "yyyyMMddHHmmss") + "@example.com"
$body = @{
  estateName = "Probe Estate"
  estateAddress = "1 Probe Street"
  adminName  = "Probe Admin"
  email      = $email
  password   = "Str0ngPassw0rd"
} | ConvertTo-Json

$headers = @{
  Origin          = $BaseUrl
  "Sec-Fetch-Site" = "same-origin"
}

$resp = Invoke-WebRequest -Method Post -Uri $uri -Headers $headers -ContentType "application/json" -Body $body -MaximumRedirection 0 -SkipHttpErrorCheck
Write-Output ("STATUS {0} BODY {1}" -f $resp.StatusCode, $resp.Content)
