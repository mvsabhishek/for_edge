﻿<# $username = "cheftest.edgenuity.com\Admin"
$password = "Jaihanuman#1234" 
$password = $password |ConvertTo-SecureString -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential -ArgumentList $env:Username,$password
#> 
cd C:\chef-repo
$nodes = @("SQL-Server-1")
For($i = 0; $i -lt $nodes.Length; $i++){
    knife node run_list add $nodes[$i] 'recipe[update_windows]' | Add-Content C:\chef-repo\log.txt| Out-Null
    #knife winrm $nodes[$i] 'chef-client' --winrm-user siva.munukutla@cheftest.edgenuity.com --winrm-password Jaihanuman#1234
    $temp = "$($nodes[$i]).cheftest.edgenuity.com"
    Invoke-Command -ComputerName $temp -ScriptBlock {chef-client} -Authentication Negotiate | Add-Content C:\chef-repo\log.txt| Out-Null
}