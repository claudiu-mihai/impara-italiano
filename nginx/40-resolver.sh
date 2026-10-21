#!/bin/sh
# Rulează la pornirea containerului (docker-entrypoint.d): scrie în /tmp resolverul DNS al mediului, citit din
# /etc/resolv.conf, pentru că adresa lui diferă (Docker: 127.0.0.11, Podman și altele: adresa rețelei).
# nginx îl folosește ca să găsească `pocketbase` la fiecare cerere, deci nu rămâne cu o adresă veche după ce
# containerul PocketBase este recreat și pornește chiar dacă PocketBase nu rulează.
set -eu
ns=$(awk '/^nameserver/ { print $2; exit }' /etc/resolv.conf)
case "$ns" in
  "") ns="127.0.0.11" ;;
  *:*) ns="[$ns]" ;; # IPv6 se scrie între paranteze drepte
esac
echo "resolver $ns valid=10s ipv6=off;" > /tmp/nginx-resolver.conf
