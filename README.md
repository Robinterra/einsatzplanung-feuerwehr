# Run
## podman variante
```bash
cd deployment/debug
podman-compose up --build
```
```bash
podman-compose -f deployment/debug/docker-compose.yml up --build
```
## npm bauen
Am anfang
```bash
npm install
npx prisma migrate dev --name init
rm -rf prisma/migrations
```
```bash
npm run build
npx next@latest .
npm run dev
npm run start
```
# TODOS
fix following:
```
added 307 packages, and audited 308 packages in 37s

60 packages are looking for funding
  run `npm fund` for details

4 vulnerabilities (2 low, 1 moderate, 1 high)

To address all issues, run:
  npm audit fix --force

Run `npm audit` for details.

```
