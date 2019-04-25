[CmdletBinding()]
Param(
 $node
)
<#
$username = "cheftest.edgenuity.com\siva.munukutla"
$password = "Jaihanuman#1234"
$cred = new-object -typename System.Management.Automation.PSCredential -argumentlist $username, $password
#>
cd C:\chef-repo
knife node run_list add $node 'recipe[update_windows]' | Add-Content C:\chef-repo\log.txt| Out-Null
#knife winrm "node:$node" 'chef-client' --winrm-user siva.munukutla@cheftest.edgenuity.com --winrm-password Jaihanuman#1234
$temp = "$node.cheftest.edgenuity.com" 
Invoke-Command -ComputerName $temp -ScriptBlock {chef-client} -Authentication Negotiate | Add-Content C:\chef-repo\log.txt | Out-Null
