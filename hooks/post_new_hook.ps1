# Powershell script for ask-cli post-new hook for Node.js
# Script Usage: post_new_hook.ps1 <SKILL_NAME> <DO_DEBUG> <TARGET>
 
# SKILL_NAME is the preformatted name passed from the CLI, after removing special characters.
# DO_DEBUG is boolean value for debug logging
 
# Run this script one level outside of the skill root folder
 
# The script does the following:
#  - Run "npm install" in each sourceDir in skill.json

param( 
    [string] $SKILL_NAME,
    [bool] $DO_DEBUG = $False
)

exit 0
