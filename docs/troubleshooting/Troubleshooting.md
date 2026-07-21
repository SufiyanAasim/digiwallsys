# Troubleshooting

## The phone cannot reach the API

Set `EXPO_PUBLIC_API_URL` to the development computer's LAN IP, keep both devices
on the same network, allow port 5000 through the local firewall, and restart Expo
after changing `.env`.

## Database connection fails

Confirm `DATABASE_URL`, database availability, and `DATABASE_SSL`. Local Docker
uses `false`; many hosted providers require `true`.

## Authentication returns 401

Log out and back in because tokens expire after one hour. Confirm the API uses
the same `JWT_SECRET` that signed the token and that the client sends `Bearer`.

## Expo shows stale behavior

Stop Expo and run `npx expo start --clear` from `src/mobile`.

## Clean verification

Run `npm install` at the root and then `npm run verify`. Never share `.env`
contents when requesting help.
