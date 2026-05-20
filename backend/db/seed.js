/**
 * Database Seed Script
 * Populates the ADR system with sample data for demonstration
 */

const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Delete existing database to start fresh
const dbPath = path.join(__dirname, 'adr_system.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Removed existing database');
}

const { getDb, closeDb } = require('./database');

async function seed() {
  const db = getDb();

  console.log('Seeding database...\n');

  // ============ USERS ============
  const passwordHash = bcrypt.hashSync('password123', 10);
  const adminHash = bcrypt.hashSync('admin123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, full_name, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const users = [
    ['admin', 'admin@adr-system.com', adminHash, 'admin', 'System Administrator', '#ef4444'],
    ['arjun.gaikwad', 'arjun@adr-system.com', passwordHash, 'architect', 'Arjun Gaikwad', '#f59e0b'],
    ['pushpal.mahajan', 'pushpal@adr-system.com', passwordHash, 'developer', 'Pushpal Mahajan', '#10b981'],
    ['prathmesh.patil', 'prathmesh@adr-system.com', passwordHash, 'developer', 'Prathmesh Patil', '#3b82f6'],
    ['harshith.yelleti', 'harshith@adr-system.com', passwordHash, 'developer', 'Yelleti Harshith', '#8b5cf6'],
    ['koshy.oomen', 'koshy@adr-system.com', passwordHash, 'viewer', 'Koshy John Oomen', '#ec4899'],
  ];

  const insertUsers = db.transaction(() => {
    for (const u of users) {
      insertUser.run(...u);
    }
  });
  insertUsers();
  console.log(`✓ Created ${users.length} users`);

  // ============ TAGS ============
  const insertTag = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)');
  const tags = [
    ['architecture', '#6366f1'],
    ['frontend', '#3b82f6'],
    ['backend', '#10b981'],
    ['database', '#f59e0b'],
    ['security', '#ef4444'],
    ['devops', '#8b5cf6'],
    ['performance', '#ec4899'],
    ['api', '#14b8a6'],
    ['infrastructure', '#f97316'],
    ['testing', '#06b6d4'],
  ];

  const insertTags = db.transaction(() => {
    for (const t of tags) {
      insertTag.run(...t);
    }
  });
  insertTags();
  console.log(`✓ Created ${tags.length} tags`);

  // ============ ADRs ============
  const insertAdr = db.prepare(`
    INSERT INTO adrs (adr_number, title, status, context, decision, consequences, alternatives, author_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const adrs = [
    {
      number: 1,
      title: 'Use Microservices Architecture',
      status: 'Accepted',
      context: `## Context

Our e-commerce platform is growing rapidly with multiple teams working on different features. The monolithic architecture is becoming a bottleneck:

- **Deployment coupling**: A change in the payment module requires redeploying the entire application
- **Scaling limitations**: We cannot scale individual components independently
- **Team autonomy**: Teams are blocked by code conflicts and shared dependencies
- **Technology lock-in**: All components must use the same technology stack

The current monolith handles ~10,000 requests/minute and we project 50,000 requests/minute within 6 months.`,
      decision: `## Decision

We will adopt a **microservices architecture** for the e-commerce platform, decomposing the monolith into the following bounded contexts:

1. **User Service** - Authentication, profiles, preferences
2. **Product Catalog Service** - Product listings, search, categories
3. **Order Service** - Order processing, status tracking
4. **Payment Service** - Payment processing, refunds
5. **Notification Service** - Email, SMS, push notifications
6. **Inventory Service** - Stock management, warehouse integration

Each service will:
- Own its data store (Database per Service pattern)
- Communicate via REST APIs for synchronous calls
- Use message queues (RabbitMQ) for async communication
- Be independently deployable`,
      consequences: `## Consequences

### Positive
- Teams can develop, deploy, and scale services independently
- Each service can use the most appropriate technology stack
- Failure in one service doesn't bring down the entire system
- Easier to onboard new developers to individual services

### Negative
- Increased operational complexity (monitoring, debugging distributed systems)
- Network latency between services
- Data consistency challenges across service boundaries
- Need for service discovery and API gateway infrastructure

### Risks
- Over-decomposition leading to excessive inter-service communication
- Distributed transaction management complexity`,
      alternatives: `## Alternatives Considered

### 1. Modular Monolith
- Keep single deployment but enforce module boundaries
- **Rejected**: Doesn't solve scaling and independent deployment needs

### 2. Service-Oriented Architecture (SOA)
- Heavier enterprise integration patterns
- **Rejected**: Too heavy-weight for our needs, ESB adds unnecessary complexity

### 3. Serverless Architecture
- Function-as-a-Service approach
- **Rejected**: Cold start issues and vendor lock-in concerns for our use case`,
      author_id: 2,
      created_at: '2026-01-15 10:00:00',
      updated_at: '2026-01-20 14:30:00',
    },
    {
      number: 2,
      title: 'Adopt React for Frontend Framework',
      status: 'Accepted',
      context: `## Context

We need to choose a frontend framework for building our e-commerce user interface. The requirements include:

- **Rich interactivity**: Product browsing, cart management, real-time updates
- **SEO requirements**: Product pages must be search engine friendly
- **Mobile responsiveness**: Must work across all devices
- **Developer availability**: We need to hire developers quickly
- **Component reusability**: Multiple pages share similar UI patterns

The team has mixed experience with different frameworks.`,
      decision: `## Decision

We will use **React 18** with the following ecosystem:

- **State Management**: React Context + useReducer for global state
- **Routing**: React Router v6
- **Styling**: CSS Modules for component-scoped styles
- **Build Tool**: Vite for fast development builds
- **Testing**: Jest + React Testing Library

For SEO-critical pages (product listings), we will implement server-side rendering using Next.js in a future phase.`,
      consequences: `## Consequences

### Positive
- Large ecosystem and community support
- Abundant developer talent pool for hiring
- Excellent performance with virtual DOM
- Rich third-party component libraries available

### Negative
- React alone doesn't provide SSR (need Next.js for SEO)
- Frequent updates may require migration effort
- JSX learning curve for developers from template-based frameworks`,
      alternatives: `## Alternatives Considered

### 1. Vue.js
- Gentler learning curve, good documentation
- **Rejected**: Smaller talent pool in our market, fewer enterprise case studies

### 2. Angular
- Full framework with batteries included
- **Rejected**: Steeper learning curve, heavier bundle size, opinionated structure

### 3. Svelte
- Excellent performance, less boilerplate
- **Rejected**: Smaller ecosystem, fewer production-proven patterns`,
      author_id: 3,
      created_at: '2026-01-18 09:00:00',
      updated_at: '2026-01-22 11:00:00',
    },
    {
      number: 3,
      title: 'Use PostgreSQL as Primary Database',
      status: 'Accepted',
      context: `## Context

We need a primary data store for our core services. Key requirements:

- **ACID compliance**: Financial transactions require strict consistency
- **Complex queries**: Product search, reporting, analytics
- **JSON support**: Product attributes vary widely across categories
- **Full-text search**: Users search across product names, descriptions
- **Scalability**: Support millions of rows with efficient indexing
- **Open source**: Avoid vendor lock-in and licensing costs`,
      decision: `## Decision

We will use **PostgreSQL 16** as our primary relational database with the following setup:

- **Primary-Replica** topology for read scaling
- **JSONB columns** for flexible product attributes
- **GIN indexes** for efficient JSON and full-text search queries
- **Connection pooling** via PgBouncer
- **Automated backups** using pg_dump with point-in-time recovery

Each microservice will have its own PostgreSQL database (database-per-service pattern).`,
      consequences: `## Consequences

### Positive
- Battle-tested reliability and ACID compliance
- Excellent JSONB support bridges relational and document models
- Rich ecosystem of tools and extensions (PostGIS, pg_trgm, etc.)
- Strong community and long-term support

### Negative
- Vertical scaling has limits compared to NoSQL solutions
- Schema migrations need careful planning in production
- Complex replication setup for high availability`,
      alternatives: `## Alternatives Considered

### 1. MySQL
- Widely used, good performance
- **Rejected**: Weaker JSON support, less advanced query optimizer

### 2. MongoDB
- Native document model, flexible schema
- **Rejected**: Lack of ACID transactions across documents (improving but not mature)

### 3. CockroachDB
- Distributed SQL, automatic sharding
- **Rejected**: Higher operational complexity, less mature ecosystem`,
      author_id: 2,
      created_at: '2026-01-20 15:00:00',
      updated_at: '2026-01-25 10:00:00',
    },
    {
      number: 4,
      title: 'Implement JWT-based Authentication',
      status: 'Accepted',
      context: `## Context

With a microservices architecture, we need a stateless authentication mechanism that:

- Works across multiple services without shared session storage
- Supports role-based access control (RBAC)
- Can be validated without hitting the auth service on every request
- Supports token refresh for good UX
- Works with both web and mobile clients`,
      decision: `## Decision

We will implement **JWT (JSON Web Token)** based authentication:

- **Access tokens**: Short-lived (15 minutes), contain user ID and roles
- **Refresh tokens**: Long-lived (7 days), stored in HTTP-only cookies
- **Token verification**: Each service validates JWT signature locally using shared public key
- **RBAC**: Roles encoded in JWT claims (admin, architect, developer, viewer)
- **Password hashing**: bcrypt with cost factor 12

\`\`\`
Authorization: Bearer <access_token>
\`\`\``,
      consequences: `## Consequences

### Positive
- Stateless: no shared session store needed across services
- Self-contained: services can validate tokens independently
- Standard: wide library support across languages
- Scalable: no database hit for token validation

### Negative
- Token revocation is complex (can't invalidate before expiry without a blocklist)
- Token size is larger than session IDs
- Sensitive data in payload requires careful handling`,
      alternatives: `## Alternatives Considered

### 1. Session-based Authentication
- Server-side sessions with shared Redis store
- **Rejected**: Requires shared state across services, scaling complexity

### 2. OAuth 2.0 with External Provider
- Delegate auth to Auth0 or Keycloak
- **Rejected**: Added dependency and cost, overkill for current scale

### 3. API Keys
- Simple key-based authentication
- **Rejected**: Not suitable for user-facing applications, lacks user identity`,
      author_id: 4,
      created_at: '2026-02-01 10:00:00',
      updated_at: '2026-02-05 16:00:00',
    },
    {
      number: 5,
      title: 'Use Redis for Session Caching',
      status: 'Proposed',
      context: `## Context

While our JWT-based auth handles authentication statelessly, we need caching for:

- **Shopping cart data**: Temporary cart state before checkout
- **Product catalog caching**: Reduce database load for frequently accessed products
- **Rate limiting**: Track API request counts per user/IP
- **Real-time features**: Pub/sub for live notifications

Current response times are averaging 200ms; target is under 50ms for cached data.`,
      decision: `## Decision

We propose using **Redis 7** as our caching and session layer:

- **Cache-aside pattern** for product catalog data
- **TTL-based expiry** for shopping carts (24 hours)
- **Sorted sets** for rate limiting with sliding window
- **Pub/Sub** for real-time notification broadcasting
- **Redis Cluster** for high availability in production`,
      consequences: `## Consequences

### Positive
- Sub-millisecond data access for cached content
- Rich data structures (sorted sets, streams) beyond simple key-value
- Built-in pub/sub for real-time features
- Proven at scale (Twitter, GitHub, Stack Overflow)

### Negative
- Additional infrastructure to manage
- Data loss risk (in-memory store, though AOF persistence mitigates)
- Memory costs can be significant at scale
- One more technology for the team to learn`,
      alternatives: `## Alternatives Considered

### 1. Memcached
- Simpler, pure caching solution
- **Under consideration**: Lacks pub/sub and complex data structures we need

### 2. Application-level Caching
- In-memory caching within each service
- **Rejected**: Cache invalidation across instances is problematic

### 3. CDN Caching
- Edge caching for static and semi-static content
- **Complementary**: Will use alongside Redis for different caching tiers`,
      author_id: 5,
      created_at: '2026-02-10 14:00:00',
      updated_at: '2026-02-10 14:00:00',
    },
    {
      number: 6,
      title: 'Adopt GraphQL for API Layer',
      status: 'Deprecated',
      context: `## Context

Our frontend teams need flexible data fetching capabilities:

- Product listing pages need different data shapes on mobile vs desktop
- Over-fetching: REST endpoints return more data than needed
- Under-fetching: Multiple REST calls needed for related data
- Rapid UI iteration requires backend changes for new data needs`,
      decision: `## Decision

~~We will adopt GraphQL using Apollo Server as our API layer.~~

**DEPRECATED**: This decision has been superseded by ADR-009 (Migrate to REST API). After 3 months of implementation, the complexity of GraphQL did not justify the benefits for our use case.`,
      consequences: `## Consequences

### Why This Was Deprecated
- N+1 query problem caused performance issues at scale
- Caching was significantly more complex than REST
- Team learning curve was higher than expected
- Monitoring and debugging were more difficult
- The flexibility was rarely used; most queries were predictable`,
      alternatives: `## Alternatives Considered

This ADR is deprecated. See ADR-009 for the replacement decision.`,
      author_id: 3,
      created_at: '2026-02-15 11:00:00',
      updated_at: '2026-03-20 09:00:00',
    },
    {
      number: 7,
      title: 'Use Docker for Containerization',
      status: 'Accepted',
      context: `## Context

Our microservices architecture requires consistent deployment across environments:

- **"Works on my machine" syndrome**: Different team members have different local setups
- **Environment parity**: Development, staging, and production should be identical
- **Dependency isolation**: Services have conflicting dependency versions
- **Deployment automation**: Need reproducible, automated deployments`,
      decision: `## Decision

We will containerize all services using **Docker**:

- **Multi-stage builds** to minimize image sizes
- **Docker Compose** for local development orchestration
- **Base images**: Node.js Alpine for backend services, nginx Alpine for frontend
- **Health checks** configured in Dockerfiles
- **Environment variables** for configuration (12-factor app compliance)

\`\`\`dockerfile
# Example multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
\`\`\``,
      consequences: `## Consequences

### Positive
- Consistent environments across development, staging, production
- Fast onboarding: new developers run \`docker compose up\` and they're ready
- Isolation: service dependencies don't conflict
- Foundation for Kubernetes deployment (see ADR-010)

### Negative
- Docker learning curve for some team members
- Debugging inside containers is slightly more complex
- Image build time adds to CI/CD pipeline duration
- Local development with volume mounts can have performance issues on macOS`,
      alternatives: `## Alternatives Considered

### 1. Virtual Machines
- Full OS-level isolation
- **Rejected**: Too heavy-weight, slow startup, resource intensive

### 2. Bare Metal / Direct Deployment
- Deploy directly to servers
- **Rejected**: Environment inconsistency, dependency conflicts

### 3. Podman
- Docker-compatible, daemonless containers
- **Rejected**: Smaller ecosystem, less tooling support currently`,
      author_id: 4,
      created_at: '2026-02-20 10:00:00',
      updated_at: '2026-02-25 15:00:00',
    },
    {
      number: 8,
      title: 'Implement Event-Driven Architecture',
      status: 'Proposed',
      context: `## Context

As our microservices grow, synchronous REST calls between services create tight coupling:

- **Availability**: If the notification service is down, order processing fails
- **Latency**: Chain of synchronous calls increases response time
- **Coupling**: Services need to know about each other's API contracts
- **Scalability**: Synchronous calls create bottlenecks under high load

We need an asynchronous communication pattern for non-time-critical operations.`,
      decision: `## Decision

We propose implementing **Event-Driven Architecture** using **RabbitMQ**:

- **Domain Events**: OrderPlaced, PaymentProcessed, InventoryUpdated, etc.
- **Event Bus**: RabbitMQ with topic exchanges for event routing
- **Event Sourcing**: For the Order service, store state as a sequence of events
- **Dead Letter Queues**: For failed message handling and retry logic
- **Idempotent consumers**: All event handlers will be idempotent`,
      consequences: `## Consequences

### Positive
- Loose coupling between services
- Better fault tolerance (async processing can retry)
- Natural audit trail through event logs
- Services can be added/removed without affecting others

### Negative
- Eventual consistency requires careful handling
- Debugging async flows is more complex
- Message broker is a single point of failure (need clustering)
- Event schema evolution needs careful management`,
      alternatives: `## Alternatives Considered

### 1. Apache Kafka
- Log-based message streaming platform
- **Under consideration**: Better for high-throughput streaming, but more complex to operate

### 2. AWS SNS/SQS
- Managed messaging service
- **Rejected**: Cloud vendor lock-in, prefer self-managed solution

### 3. Direct async HTTP (Webhooks)
- Point-to-point async calls
- **Rejected**: Still creates coupling, no replay capability`,
      author_id: 2,
      created_at: '2026-03-01 09:00:00',
      updated_at: '2026-03-01 09:00:00',
    },
    {
      number: 9,
      title: 'Migrate to REST API (Supersedes GraphQL)',
      status: 'Accepted',
      context: `## Context

After 3 months of using GraphQL (ADR-006), we've identified several issues:

- **Performance**: N+1 query problem in resolvers caused p99 latency to spike to 2 seconds
- **Caching**: HTTP caching is trivial with REST, complex with GraphQL
- **Monitoring**: REST endpoints are easier to monitor and set alerts on
- **Team productivity**: Developers spent more time on schema design than feature development
- **Tooling**: REST has more mature tooling for API documentation (Swagger/OpenAPI)

Our data access patterns turned out to be more predictable than initially assumed, reducing the need for GraphQL's flexibility.`,
      decision: `## Decision

We will **migrate from GraphQL to REST APIs** with the following standards:

- **OpenAPI 3.0** specification for all endpoints
- **JSON:API** format for consistent response structures
- **Versioning**: URL-based versioning (\`/api/v1/...\`)
- **Pagination**: Cursor-based pagination for list endpoints
- **Filtering**: Query parameter-based filtering
- **Documentation**: Auto-generated Swagger UI

This supersedes ADR-006 (Adopt GraphQL for API Layer).`,
      consequences: `## Consequences

### Positive
- Simpler caching at HTTP level (CDN, browser, reverse proxy)
- Better monitoring and alerting per endpoint
- Team is more productive with familiar REST patterns
- Mature tooling ecosystem (Swagger, Postman, etc.)

### Negative
- Potential over-fetching (mitigated by sparse fieldsets)
- Multiple round trips for complex data needs
- Migration effort from existing GraphQL schema

### Migration Plan
1. Phase 1: Create REST endpoints alongside GraphQL (2 weeks)
2. Phase 2: Migrate frontend to REST endpoints (2 weeks)
3. Phase 3: Remove GraphQL layer (1 week)`,
      alternatives: `## Alternatives Considered

### 1. Fix GraphQL Performance
- Implement DataLoader pattern, query complexity limits
- **Rejected**: Band-aid solution, doesn't address monitoring and caching issues

### 2. gRPC
- High-performance binary protocol
- **Rejected**: Not suitable for browser clients without a proxy, REST is simpler for our needs

### 3. Hybrid Approach
- REST for simple queries, GraphQL for complex ones
- **Rejected**: Maintaining two API layers increases complexity`,
      author_id: 3,
      created_at: '2026-03-15 10:00:00',
      updated_at: '2026-03-20 09:00:00',
    },
    {
      number: 10,
      title: 'Adopt Kubernetes for Container Orchestration',
      status: 'Proposed',
      context: `## Context

With Docker containerization in place (ADR-007) and growing to 6+ microservices, we need container orchestration:

- **Manual scaling**: Currently scaling services by manually adding containers
- **Service discovery**: Services hardcode each other's addresses
- **Zero-downtime deployments**: Need rolling updates without downtime
- **Self-healing**: Containers that crash need automatic restart
- **Resource management**: Need to set CPU/memory limits per service`,
      decision: `## Decision

We propose adopting **Kubernetes (K8s)** for container orchestration:

- **Managed K8s**: Use EKS (AWS) or AKS (Azure) to reduce operational burden
- **Helm Charts**: Package service deployments as Helm charts
- **Horizontal Pod Autoscaler**: Auto-scale based on CPU/memory metrics
- **Ingress Controller**: nginx-ingress for routing and TLS termination
- **ConfigMaps & Secrets**: Externalized configuration management
- **Namespaces**: Separate environments (dev, staging, prod) in same cluster`,
      consequences: `## Consequences

### Positive
- Automated scaling, self-healing, and load balancing
- Built-in service discovery and DNS
- Rolling updates with zero downtime
- Infrastructure as code through manifests
- Industry standard with strong community

### Negative
- Significant learning curve for the team
- Complex networking and debugging
- Resource overhead (K8s control plane consumes resources)
- Cost of managed K8s service

### Prerequisites
- ADR-007 (Docker) must be implemented first
- Team needs Kubernetes training (2-week ramp-up)`,
      alternatives: `## Alternatives Considered

### 1. Docker Swarm
- Simpler orchestration built into Docker
- **Rejected**: Smaller ecosystem, fewer features, declining community

### 2. AWS ECS
- AWS-native container orchestration
- **Rejected**: AWS vendor lock-in, less portable

### 3. Nomad (HashiCorp)
- Simpler than K8s, supports mixed workloads
- **Under consideration**: Less ecosystem support but simpler operations`,
      author_id: 5,
      created_at: '2026-03-25 14:00:00',
      updated_at: '2026-03-25 14:00:00',
    },
  ];

  const insertAdrs = db.transaction(() => {
    for (const adr of adrs) {
      insertAdr.run(
        adr.number, adr.title, adr.status,
        adr.context, adr.decision, adr.consequences, adr.alternatives,
        adr.author_id, adr.created_at, adr.updated_at
      );
    }
  });
  insertAdrs();
  console.log(`✓ Created ${adrs.length} ADRs`);

  // ============ ADR TAGS ============
  const insertAdrTag = db.prepare('INSERT INTO adr_tags (adr_id, tag_id) VALUES (?, ?)');
  const adrTags = [
    [1, 1], [1, 3], // Microservices: architecture, backend
    [2, 2], [2, 1], // React: frontend, architecture
    [3, 4], [3, 3], // PostgreSQL: database, backend
    [4, 5], [4, 3], [4, 8], // JWT: security, backend, api
    [5, 7], [5, 3], // Redis: performance, backend
    [6, 8], [6, 2], // GraphQL: api, frontend
    [7, 6], [7, 9], // Docker: devops, infrastructure
    [8, 1], [8, 3], // Event-Driven: architecture, backend
    [9, 8], [9, 3], // REST: api, backend
    [10, 6], [10, 9], // K8s: devops, infrastructure
  ];

  const insertAdrTags = db.transaction(() => {
    for (const [adrId, tagId] of adrTags) {
      insertAdrTag.run(adrId, tagId);
    }
  });
  insertAdrTags();
  console.log(`✓ Created ${adrTags.length} ADR-Tag associations`);

  // ============ ADR RELATIONS ============
  const insertRelation = db.prepare(
    'INSERT INTO adr_relations (source_adr_id, target_adr_id, relation_type) VALUES (?, ?, ?)'
  );
  const relations = [
    [9, 6, 'supersedes'],      // REST supersedes GraphQL
    [10, 7, 'depends-on'],     // K8s depends on Docker
    [4, 1, 'related-to'],      // JWT related to Microservices
    [5, 3, 'related-to'],      // Redis related to PostgreSQL
    [8, 1, 'related-to'],      // Event-Driven related to Microservices
  ];

  const insertRelations = db.transaction(() => {
    for (const [source, target, type] of relations) {
      insertRelation.run(source, target, type);
    }
  });
  insertRelations();
  console.log(`✓ Created ${relations.length} ADR relations`);

  // ============ COMMENTS ============
  const insertComment = db.prepare(
    'INSERT INTO comments (adr_id, user_id, content, created_at) VALUES (?, ?, ?, ?)'
  );
  const comments = [
    [1, 3, 'How do we handle cross-service transactions? Saga pattern?', '2026-01-16 09:30:00'],
    [1, 2, 'Yes, we should use the Saga pattern with choreography for simple flows and orchestration for complex ones.', '2026-01-16 10:15:00'],
    [1, 4, 'What about service mesh for inter-service communication? Istio could handle retries, circuit breaking, etc.', '2026-01-17 14:00:00'],
    [2, 5, 'Should we consider Next.js from the start for SSR instead of adding it later?', '2026-01-19 11:00:00'],
    [2, 3, 'Starting with plain React keeps things simpler. We can migrate critical pages to Next.js when SEO becomes a priority.', '2026-01-19 14:30:00'],
    [3, 4, 'Have we benchmarked PostgreSQL JSONB performance vs MongoDB for our product catalog use case?', '2026-01-21 10:00:00'],
    [3, 2, 'Yes, for our read-heavy workload with GIN indexes, PostgreSQL JSONB performs within 10% of MongoDB while giving us ACID compliance.', '2026-01-22 09:00:00'],
    [4, 5, 'What is our strategy for token revocation? If a user changes their password, existing tokens should be invalidated.', '2026-02-02 11:00:00'],
    [4, 4, 'We will maintain a blocklist in Redis for revoked tokens. The TTL on blocklist entries matches the token expiry.', '2026-02-03 09:30:00'],
    [6, 2, 'The N+1 problem is getting worse as our schema grows. DataLoader helps but doesn\'t solve the fundamental issue.', '2026-03-10 10:00:00'],
    [6, 3, 'Agreed. Let\'s deprecate this and move to REST. Creating ADR-009 for the migration.', '2026-03-12 15:00:00'],
    [9, 5, 'The migration went smoothly. p99 latency dropped from 2s to 200ms after switching to REST.', '2026-03-22 10:00:00'],
    [10, 2, 'Let\'s ensure the team completes K8s training before we start. I recommend the CKA course.', '2026-03-26 09:00:00'],
    [10, 4, 'Should we start with a simpler setup like K3s for development and use full K8s only in production?', '2026-03-26 14:00:00'],
  ];

  const insertComments = db.transaction(() => {
    for (const [adrId, userId, content, createdAt] of comments) {
      insertComment.run(adrId, userId, content, createdAt);
    }
  });
  insertComments();
  console.log(`✓ Created ${comments.length} comments`);

  // ============ REVIEWS ============
  const insertReview = db.prepare(
    'INSERT INTO adr_reviews (adr_id, reviewer_id, decision, comment, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const reviews = [
    [1, 1, 'approved', 'Solid decision. Microservices is the right approach for our growth trajectory.', '2026-01-18 10:00:00'],
    [1, 4, 'approved', 'Agree. The bounded contexts are well-defined.', '2026-01-19 09:00:00'],
    [2, 2, 'approved', 'React is a safe choice with our hiring needs.', '2026-01-20 11:00:00'],
    [3, 1, 'approved', 'PostgreSQL + JSONB is a great combo for our needs.', '2026-01-23 10:00:00'],
    [4, 1, 'approved', 'JWT with refresh tokens is industry standard. Approved.', '2026-02-04 10:00:00'],
    [7, 1, 'approved', 'Docker is essential for our deployment strategy.', '2026-02-23 10:00:00'],
    [9, 2, 'approved', 'REST migration is the right call. GraphQL added too much complexity.', '2026-03-18 10:00:00'],
    [5, 2, 'needs-changes', 'Please add benchmarks comparing Redis vs Memcached for our specific use cases.', '2026-02-12 10:00:00'],
  ];

  const insertReviews = db.transaction(() => {
    for (const [adrId, reviewerId, decision, comment, createdAt] of reviews) {
      insertReview.run(adrId, reviewerId, decision, comment, createdAt);
    }
  });
  insertReviews();
  console.log(`✓ Created ${reviews.length} reviews`);

  // ============ VERSION HISTORY ============
  const insertVersion = db.prepare(`
    INSERT INTO adr_versions (adr_id, version_number, title, status, context, decision, consequences, alternatives, changed_by, change_summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const versions = [
    [1, 1, 'Use Microservices Architecture', 'Proposed', adrs[0].context, adrs[0].decision, adrs[0].consequences, adrs[0].alternatives, 2, 'Initial proposal', '2026-01-15 10:00:00'],
    [1, 2, 'Use Microservices Architecture', 'Accepted', adrs[0].context, adrs[0].decision, adrs[0].consequences, adrs[0].alternatives, 1, 'Approved after review', '2026-01-20 14:30:00'],
    [6, 1, 'Adopt GraphQL for API Layer', 'Proposed', adrs[5].context, 'We will adopt GraphQL using Apollo Server.', 'Flexible data fetching, reduced over-fetching.', adrs[5].alternatives, 3, 'Initial proposal', '2026-02-15 11:00:00'],
    [6, 2, 'Adopt GraphQL for API Layer', 'Accepted', adrs[5].context, 'We will adopt GraphQL using Apollo Server.', 'Flexible data fetching, reduced over-fetching.', adrs[5].alternatives, 1, 'Approved for trial period', '2026-02-20 10:00:00'],
    [6, 3, 'Adopt GraphQL for API Layer', 'Deprecated', adrs[5].context, adrs[5].decision, adrs[5].consequences, adrs[5].alternatives, 3, 'Deprecated in favor of REST (ADR-009)', '2026-03-20 09:00:00'],
    [9, 1, 'Migrate to REST API', 'Proposed', adrs[8].context, adrs[8].decision, adrs[8].consequences, adrs[8].alternatives, 3, 'Initial proposal to replace GraphQL', '2026-03-15 10:00:00'],
    [9, 2, 'Migrate to REST API (Supersedes GraphQL)', 'Accepted', adrs[8].context, adrs[8].decision, adrs[8].consequences, adrs[8].alternatives, 2, 'Approved after successful pilot', '2026-03-20 09:00:00'],
  ];

  const insertVersions = db.transaction(() => {
    for (const v of versions) {
      insertVersion.run(...v);
    }
  });
  insertVersions();
  console.log(`✓ Created ${versions.length} version history entries`);

  console.log('\n✅ Database seeded successfully!');
  console.log('\nSample login credentials:');
  console.log('  Admin:    admin / admin123');
  console.log('  Architect: arjun.gaikwad / password123');
  console.log('  Developer: pushpal.mahajan / password123');

  closeDb();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
