---
layout: single
author_profile: true
read_time: true
comments: false
share: true
related: true
title: Making Scientific Raster Data Accessible — A Cloud-Native Approach
date: 2025-11-28
categories:
  - geospatial
  - cloud
  - infrastructure
tags:
  - netcdf
  - zarr
  - cog
  - aws
  - stac
  - api
  - raster
toc: true
toc_sticky: true
header:
  image: /assets/images/raster_platform_architecture.svg 
  teaser: /assets/images/raster_platform_architecture.svg
excerpt: "Building a production-ready platform for sharing large scientific raster datasets. From NetCDF files to interactive map tiles and timeseries APIs, with automated ingestion, STAC cataloging, and distributed computing."
---

I recently completed a platform for sharing scientific raster data—the kind of multi-dimensional datasets that climate scientists, earth observation researchers, and environmental analysts work with daily. These NetCDF files can be massive, difficult to query, and challenging to serve over the web. This project tackles those problems head-on, transforming unwieldy data files into accessible, queryable resources through a modern cloud-native architecture.

## The Problem: NetCDF Files Are Hard to Share

Scientific raster data typically comes in NetCDF format—a self-describing, multi-dimensional file format that's excellent for archival but challenging for web access. A single file might contain temperature readings across space and time, with dimensions for latitude, longitude, time, and multiple variables. These files can be gigabytes or terabytes in size.

The challenges are clear:
- **Size**: Files too large to download casually
- **Access patterns**: Users want specific slices (a location's timeseries, a map at one timestamp), not entire files
- **Discoverability**: Finding relevant datasets across collections is difficult
- **Performance**: Reading from NetCDF over HTTP is slow without optimization

Traditional approaches—FTP servers, direct file downloads—don't scale for modern web applications or interactive analysis. Users need APIs that return exactly what they need: a map tile, a timeseries chart, a spatial subset.

![Placeholder: Architecture diagram showing data flow from NetCDF upload to API endpoints]

## The Solution: A Multi-Format, API-First Platform

The platform addresses these challenges through a dual-format storage strategy and automated processing pipeline. When a NetCDF file is uploaded, it's automatically converted into two cloud-optimized formats:

**Cloud-Optimized GeoTIFF (COG)** for spatial queries:
- Optimized for reading specific spatial regions
- Supports efficient map tile generation
- Internal tiling and overviews for fast access at multiple zoom levels

**Zarr** for temporal queries:
- Chunked, compressed array storage
- Optimized for reading timeseries at specific locations
- Enables parallel processing across time dimensions

This dual-format approach means the right tool for each job: COG for "show me a map" and Zarr for "show me how this location changed over time."

### What the Platform Enables

**For End Users:**
- **Interactive map tiles**: Visualize any variable at any timestamp through standard web mapping libraries
- **Timeseries extraction**: Query any point location to get its complete temporal profile
- **STAC catalog**: Search and discover datasets by location, time, and metadata
- **RESTful API**: Standard HTTP endpoints that work with any client

**For Data Providers:**
- **Automated ingestion**: Drop NetCDF files in S3, everything else happens automatically
- **Format conversion**: NetCDF → Zarr + COG without manual intervention
- **Metadata extraction**: STAC items created and indexed automatically
- **Scalable processing**: Handles files from megabytes to gigabytes

![Placeholder: Screenshot of map tiles showing raster data visualization]

## Architecture: How It Works

The platform is built on AWS using a serverless and container-based architecture that balances cost, performance, and maintainability.

### Ingestion Pipeline

#### High-Level Architecture

```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  CloudFront CDN │ (Tile caching, HTTPS)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│      ALB        │ (HTTPS listener, path routing)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│ Tiles  │ │Timeseries│ (ECS Fargate services)
│Service │ │ Service  │
└───┬────┘ └────┬─────┘
    │           │
    │           ▼
    │      ┌─────────┐
    │      │  Dask   │ (Scheduler + Workers)
    │      │ Cluster │
    │      └────┬────┘
    │           │
    └───────┬───┴──────┐
            │          │
            ▼          ▼
       ┌────────┐  ┌──────────┐
       │   S3   │  │OpenSearch│
       │ Zarr/  │  │  (STAC)  │
       │  COG   │  └──────────┘
       └────────┘
            ▲
            │
    ┌───────┴────────┐
    │   Ingestion    │
    │    Pipeline    │
    │ (Lambda + Step │
    │   Functions)   │
    └───────▲────────┘
            │
       ┌────┴────┐
       │   S3    │
       │  Raw    │
       │ NetCDF  │
       └─────────┘
```

### Component Interaction Flow

**Tile Request Flow:**
1. User requests tile → CloudFront (cache check)
2. Cache miss → ALB → Tiles ECS Service
3. Service queries OpenSearch for COG location
4. Service reads COG from S3, renders tile
5. Response cached at CloudFront edge

**Timeseries Request Flow:**
1. User requests timeseries → CloudFront (no cache) → ALB → Timeseries ECS Service
2. Service queries OpenSearch for overlapping datasets
3. Service submits Dask tasks to read Zarr from S3
4. Dask workers process in parallel, aggregate results
5. Service caches result in Redis, returns to user

**Ingestion Flow:**
1. NetCDF uploaded to S3 raw bucket
2. S3 event triggers Lambda
3. Lambda starts Step Functions workflow
4. Workflow orchestrates: NetCDF→Zarr conversion, COG generation, STAC item creation
5. STAC item indexed in OpenSearch

When a NetCDF file lands in S3:

1. **S3 Event Trigger** → Lambda function validates the file
2. **Step Functions** orchestrates the conversion workflow
3. **Conversion Tasks** (Lambda or ECS) process the file:
   - NetCDF → Zarr (rechunked for optimal access)
   - NetCDF → COG (with overviews for multiple zoom levels)
4. **STAC Creation** extracts metadata (bounding box, temporal extent, variables)
5. **DynamoDB Indexing** makes the dataset searchable

The entire pipeline is event-driven and scales automatically. Upload one file or one hundred—the system handles it.

### API Layer

The API runs on ECS Fargate with two primary endpoints:

**Tiles Service** (`/tiles/{collection}/{z}/{x}/{y}.png`):
- Reads from COG files in S3
- Renders map tiles on-demand
- Cached by CloudFront CDN for global performance
- Supports multiple resampling methods and color ramps

**Timeseries Service** (`/api/timeseries`):
- Queries Zarr stores for point-based temporal data
- Uses Dask for distributed processing of large queries
- Caches results in Redis for repeated queries
- Returns JSON with timestamps and values

Both services authenticate via AWS Cognito, support CORS for web clients, and expose Prometheus metrics for monitoring.

![Placeholder: Sequence diagram showing API request flow]

## Technical Highlights

### STAC Catalog with DynamoDB

The platform implements a SpatioTemporal Asset Catalog (STAC) for dataset discovery. Initially designed with OpenSearch, we migrated to DynamoDB and achieved a 90% cost reduction while improving query performance for common access patterns.

DynamoDB provides:
- Single-digit millisecond latency for item lookups
- Automatic scaling with on-demand billing
- Global secondary indexes for collection and temporal queries
- Point-in-time recovery for data protection

The STAC implementation supports standard query patterns: search by collection, filter by datetime range, and spatial bounding box queries. This makes the catalog compatible with existing STAC clients and tools.

### Distributed Computing with Dask

For computationally intensive timeseries queries—extracting data across many timestamps or large spatial regions—the platform uses Dask for distributed processing. A Dask scheduler runs as an ECS service with worker tasks that scale based on demand.

This architecture enables:
- Parallel reading from multiple Zarr chunks
- Aggregation across temporal dimensions
- Efficient memory management for large arrays
- Graceful degradation when Dask is unavailable

### Security and Authentication

The platform implements defense-in-depth security:

- **Network isolation**: ECS tasks run in private subnets with no direct internet access
- **VPC endpoints**: S3 and DynamoDB accessed through VPC endpoints to avoid NAT gateway costs
- **IAM least privilege**: Task roles scoped to specific S3 prefixes and DynamoDB tables
- **Cognito authentication**: JWT validation on all API requests
- **Encryption**: Data encrypted at rest (S3, DynamoDB) and in transit (TLS)
- **Security scanning**: Checkov validates Terraform configurations against security best practices

### Infrastructure as Code

The entire platform is defined in Terraform with modular components:

- **Network module**: VPC, subnets, security groups, VPC endpoints
- **IAM module**: Roles and policies for ECS tasks, Lambda functions, Step Functions
- **Data module**: S3 buckets, DynamoDB tables, ElastiCache Redis
- **ECS module**: Task definitions, services, autoscaling policies, ALB configuration
- **Ingestion module**: Lambda functions, Step Functions state machines, S3 event notifications

This modular approach enables:
- Reusable components across environments
- Clear separation of concerns
- Easier testing and validation
- Documented infrastructure through code

### CI/CD Pipeline

GitHub Actions automates the deployment workflow:

1. **Test**: Run unit tests and property-based tests
2. **Build**: Create Docker image and push to ECR
3. **Security**: Run Checkov security scans on Terraform
4. **Documentation**: Auto-generate Terraform module documentation
5. **Deploy**: Update ECS task definitions and trigger rolling deployment
6. **Smoke Test**: Validate health endpoints and sample API requests

The pipeline includes cost estimation with Infracost, providing visibility into infrastructure costs before deployment.

![Placeholder: CI/CD pipeline diagram]

## Performance and Scale

The platform is designed for production workloads:

**Autoscaling:**
- Tiles service: 2-10 tasks based on CPU utilization
- Timeseries service: 2-20 tasks based on CPU utilization
- Target tracking at 70% CPU with configurable cooldown periods

**Caching:**
- CloudFront caches tiles for 24 hours at edge locations
- Redis caches timeseries results with configurable TTL
- Reduces backend load and improves response times

**Monitoring:**
- CloudWatch logs with 7-day retention
- Prometheus metrics exposed at `/metrics` endpoint
- CloudWatch alarms for high error rates, latency, and service health
- Structured logging for debugging and analysis

**Cost Optimization:**
- DynamoDB on-demand billing (pay per request)
- ECS Fargate spot instances for non-critical workloads
- S3 lifecycle policies for archival
- VPC endpoints to avoid NAT gateway costs
- Estimated monthly cost: $85-285 depending on usage

## Real-World Applications

This architecture is applicable to various scientific domains:

**Climate Science:**
- Historical temperature and precipitation data
- Climate model outputs
- Reanalysis datasets

**Earth Observation:**
- Satellite imagery timeseries
- Land cover change detection
- Vegetation indices

**Environmental Monitoring:**
- Air quality measurements
- Ocean temperature and salinity
- Soil moisture data

**Hydrology:**
- Streamflow predictions
- Groundwater levels
- Precipitation forecasts

The key is transforming static files into queryable, accessible data through standardized APIs.

## Lessons Learned

**Right-size your database:** OpenSearch was overkill for simple STAC catalog queries. DynamoDB provided better performance at 10% of the cost. Choose databases based on actual query patterns, not perceived needs.

**Dual formats work:** COG for spatial queries and Zarr for temporal queries proved effective. Each format is optimized for its use case, and the storage overhead is justified by query performance.

**Event-driven ingestion scales:** S3 events triggering Lambda functions provide a simple, scalable ingestion pattern. No polling, no scheduling—just upload and process.

**Infrastructure as code is essential:** Terraform modules made the infrastructure reproducible, testable, and documentable. The ability to tear down and recreate environments saved significant debugging time.

**Security from the start:** Implementing security best practices early—private subnets, least-privilege IAM, encryption—is easier than retrofitting later. Automated security scanning with Checkov caught issues before deployment.

**Monitor everything:** CloudWatch logs, metrics, and alarms provided visibility into system behavior. Prometheus metrics enabled detailed performance analysis. You can't optimize what you don't measure.

## Future Enhancements

Several improvements are on the roadmap:

**Kerchunk for virtual datasets:** Instead of converting NetCDF to Zarr, create JSON reference files that enable Zarr-like access to original NetCDF files. This eliminates data duplication and speeds ingestion dramatically.

**Serverless API with Lambda:** For lower-traffic deployments, replace ECS services with API Gateway + Lambda to reduce costs and eliminate idle capacity.

**Enhanced STAC features:** Add support for STAC collections, asset management, and more complex spatial queries.

**Batch processing optimization:** Use AWS Batch for large file conversions to optimize cost and performance.

**Multi-region deployment:** Replicate data and services across regions for global access and disaster recovery.

## Conclusion

Building a platform for scientific raster data requires balancing multiple concerns: performance, cost, security, and maintainability. This architecture demonstrates that it's possible to make large, complex datasets accessible through modern cloud-native patterns.

The key insights:
- **Format matters**: Cloud-optimized formats (COG, Zarr) enable efficient access patterns
- **Automation scales**: Event-driven pipelines handle variable workloads without manual intervention
- **Standards enable interoperability**: STAC makes datasets discoverable and compatible with existing tools
- **Right-sizing saves money**: Choose services based on actual needs, not maximum capabilities
- **Infrastructure as code**: Terraform makes complex systems reproducible and maintainable

The result is a platform that transforms unwieldy NetCDF files into accessible, queryable resources—making scientific data more useful for research, analysis, and decision-making.

## Resources

- [STAC Specification](https://stacspec.org/) - SpatioTemporal Asset Catalog standard
- [Cloud-Optimized GeoTIFF](https://www.cogeo.org/) - COG format specification
- [Zarr](https://zarr.readthedocs.io/) - Chunked, compressed array storage
- [Dask](https://dask.org/) - Distributed computing in Python
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs) - Infrastructure as code
- [rio-tiler](https://cogeotiff.github.io/rio-tiler/) - Raster tile generation library
