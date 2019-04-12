$body = @{
    Cluster = "cluster-1"
    Node = "SQL1"
    Status = "done"
}
$resource = "http://localhost:3000/api/update_status"

Invoke-RestMethod -Method Post -Uri $resource -Body (ConvertTo-Json $body) -Header @{"Content-Type" = "application/json"}| ConvertTo-Json 

# Write-Host (ConvertTo-Json $body)
