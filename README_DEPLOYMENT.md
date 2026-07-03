# MehandiGo - Production Infrastructure Deployment Manual

This document details setup procedures, container orchestration rules, AWS cloud architectures, backup policies, and rollback protocols for MehandiGo.

---

## 1. System Architecture

```
                       [ HTTPS Traffic: Port 443 ]
                                    |
                                    v
                     [ AWS Application Load Balancer ]
                                    |
                                    v
                        [ Nginx Gateway Container ]
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
[ React Admin: Port 80 ]                       [ Node API: Port 3000 ]
                                                            |
                                                   +--------+--------+
                                                   |                 |
                                                   v                 v
                                         [ PostgreSQL: Port 5432 ] [ Redis ]
```

---

## 2. Docker & Container Environments

We maintain three environment stacks:
1. **Development (`docker-compose.dev.yml`)**: Spins up backing DB services on port `5434`. Node server and React dashboard are run on host.
2. **Staging (`docker-compose.staging.yml`)**: Builds backend, frontend, and database containers on port `8080`.
3. **Production (`docker-compose.prod.yml`)**: Fully isolated container orchestration behind Nginx gateway SSL proxies.

### Quick Start Commands

#### Local Backend backing PostgreSQL
```bash
docker compose -f docker-compose.dev.yml up -d
```

#### Run Full Staging Stack
```bash
docker compose -f docker-compose.staging.yml up -d --build
```

#### Launch Production High-Availability Stack
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 3. AWS Server Provisioning & SSL

1. **AWS EC2 Instance**: Use an `m5.large` or `t3.medium` instance running Ubuntu 22.04 LTS.
2. **Elastic IP**: Attach a permanent Elastic IP to the EC2 server and point your DNS A-record (e.g. `admin.mehandigo.com`) to it.
3. **Security Groups Settings**:
   - Inbound rules: Allow HTTP (`80`), HTTPS (`443`), and SSH (`22`).
   - Outbound: Allow all traffic.

### SSL Let's Encrypt Setup
To generate certificate buffers:
```bash
# Install certbot on host
sudo apt update && sudo apt install certbot -y

# Generate certificate
sudo certbot certonly --standalone -d admin.mehandigo.com
```
Certificates are mounted into the Nginx container via `./certs:/etc/letsencrypt` folder reference in `docker-compose.prod.yml`.

---

## 4. PM2 Clustered Process Controls

To run backend clusters on host bare-metal instances (alternative to Docker production compose):
```bash
# Install PM2 globally
npm install pm2 -g

# Start cluster using ecosystem profile
pm2 start ecosystem.config.js

# Monitor live cluster performance
pm2 monit

# Save configuration
pm2 save && pm2 startup
```

---

## 5. Automated Backups & Disaster Recovery

### Manual PostgreSQL Backups
```bash
# Dump prod DB to backups folder
docker exec -t mehndigo_prod_postgres pg_dumpall -c -U ankit > ./backups/db_backup_$(date +%F).sql
```

### Database Restore Procedure
In event of a server crash or database failure:
```bash
# Re-init Postgres container
docker compose -f docker-compose.prod.yml up -d postgres

# Restore dump
cat ./backups/db_backup_date.sql | docker exec -i mehndigo_prod_postgres psql -U ankit -d mehndigo_prod_db
```

### Rollback Strategy
If a deployment fails, trigger rollbacks via Docker container images tag swaps:
```bash
# Rollback source code to stable tag
git checkout tags/v1.0.4

# Re-deploy using target version
docker compose -f docker-compose.prod.yml up -d --build
```
