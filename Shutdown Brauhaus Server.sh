#!/bin/bash

# Das Passwort für sudo (ersetzen Sie 'IhrPasswort' durch das tatsächliche Passwort)
SUDO_PASSWORD="d8wuz4jz"

# Verbinden Sie sich mit dem Remote-Server und führen Sie den Befehl zum Herunterfahren aus
echo "$SUDO_PASSWORD" | ssh -tt boris@192.168.178.72 "echo '$SUDO_PASSWORD' | sudo -S shutdown -h now"

