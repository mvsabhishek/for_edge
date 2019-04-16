[CmdletBinding()]
Param(
 $node
)
cd C:\chef-repo
knife node run_list add $node 'recipe[update_windows]' | Add-Content C:\chef-repo\log.txt| Out-Null
#knife winrm "node:$node" 'chef-client' --winrm-user siva.munukutla@cheftest.edgenuity.com --winrm-password Jaihanuman#1234
$temp = "$node.cheftest.edgenuity.com" 
Invoke-Command -ComputerName $temp -ScriptBlock {chef-client} | Out-Null
