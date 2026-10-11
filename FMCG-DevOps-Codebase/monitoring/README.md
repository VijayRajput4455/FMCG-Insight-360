# FMCG Insight 360 - Monitoring Setup

This directory contains the monitoring stack configuration for centralized logging and metrics collection.

## 🚀 Quick Start

1. **Start the monitoring stack:**
   ```bash
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

2. **Access the services:**
   - **Grafana**: http://localhost:3000 (admin/admin)
   - **Prometheus**: http://localhost:9090
   - **Loki**: http://localhost:3100

3. **View the dashboard:**
   - Open Grafana → Dashboards → FMCG Insight 360 - Monitoring

## 📊 What's Included

### **Logs (Loki + Promtail)**
- ✅ Centralized log aggregation
- ✅ Structured log parsing (level, module, request_id, etc.)
- ✅ Historical log search and filtering
- ✅ Log correlation with request IDs

### **Metrics (Prometheus)**
- ✅ Request count and latency
- ✅ Rate limiting violations
- ✅ Audit request tracking
- ✅ Cache performance metrics
- ✅ Database connection monitoring

### **Visualization (Grafana)**
- ✅ Pre-configured dashboard
- ✅ Real-time metrics
- ✅ Log exploration
- ✅ Alerting capabilities

## 🔧 Configuration

### Environment Variables
```env
# Rate limiting (already configured)
RATE_LIMIT_REQUESTS_PER_MINUTE=3
RATE_LIMIT_WINDOW_SECONDS=60
```

### Log Structure
Your logs are automatically parsed with these fields:
- `timestamp`: Log timestamp
- `level`: Log level (INFO, WARNING, ERROR)
- `request_id`: Request correlation ID
- `module`: Python module name
- `function`: Function name
- `line`: Line number
- `message`: Log message

## 📈 Available Metrics

### HTTP Metrics
- `fmcg_requests_total{method, endpoint, status_code}` - Total requests
- `fmcg_request_duration_seconds{method, endpoint}` - Request latency
- `fmcg_active_connections` - Active connections

### Business Metrics
- `fmcg_audit_requests_total{product_code, status}` - Audit requests
- `fmcg_rate_limit_exceeded_total{endpoint, ip}` - Rate limit violations

### System Metrics
- `fmcg_cache_hits_total` - Cache hits
- `fmcg_cache_misses_total` - Cache misses
- `fmcg_db_connections_active` - Active DB connections

## 🔍 LogQL Queries

Search logs in Grafana Explore:

```logql
# All errors
{job="fmcg_app"} |= `ERROR`

# Rate limiting events
{job="fmcg_app"} |= `Rate limit exceeded`

# Specific request ID
{job="fmcg_app"} | request_id=`your-request-id`

# Audit operations
{job="fmcg_app"} |= `audit` |= `detection`
```

## 🚨 Alerting

Set up alerts in Grafana for:
- High error rates
- Rate limiting spikes
- Slow response times
- Queue backlog

## 🛠 Troubleshooting

### **Logs not appearing?**
- Check Promtail status: `docker logs promtail`
- Verify log file paths in `promtail-config.yml`

### **Metrics not showing?**
- Check `/metrics` endpoint: `curl http://localhost:8000/metrics`
- Verify Prometheus targets: http://localhost:9090/targets

### **Dashboard issues?**
- Check Grafana logs: `docker logs grafana`
- Verify datasource connections in Grafana

## 📚 Resources

- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [LogQL Reference](https://grafana.com/docs/loki/latest/logql/)