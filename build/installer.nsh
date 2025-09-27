!macro customInstall
  ; Prompt the user to allow internet access by creating Windows Firewall rules
  ; This runs elevated (requires allowElevation/admin). It silently adds rules for inbound/outbound for the app's exe.
  ; Users will also see the standard Windows Defender Firewall prompt on first bind if applicable.

  ; Determine install dir and exe path (Electron-Builder sets $INSTDIR)
  StrCpy $0 "$INSTDIR\\Couples To-do.exe"

  ; Create inbound rule
  nsExec::ExecToStack 'netsh advfirewall firewall add rule name="Couples To-do Inbound" dir=in action=allow program="$0" enable=yes profile=any'
  Pop $1 ; return code
  Pop $2 ; output

  ; Create outbound rule
  nsExec::ExecToStack 'netsh advfirewall firewall add rule name="Couples To-do Outbound" dir=out action=allow program="$0" enable=yes profile=any'
  Pop $3
  Pop $4
!macroend

!macro customUnInstall
  ; Remove firewall rules on uninstall
  nsExec::ExecToStack 'netsh advfirewall firewall delete rule name="Couples To-do Inbound"'
  Pop $1
  Pop $2
  nsExec::ExecToStack 'netsh advfirewall firewall delete rule name="Couples To-do Outbound"'
  Pop $3
  Pop $4
!macroend
