---
layout: single
author_profile: true
read_time: true
comments: false
share: true
related: true
title: Cloudformation, SAM or Terraform?
date: 2025-08-08
categories:
  - aws
  - devops
  - cloud
tags:
  - aws
  - iac
  - cloudformation
  - infrastructure-as-code
  - terraform
  - cloud
toc: true
toc-sticky: true
# header:
#   image: /assets/images/ArcGIS_Origin_Architecture.svg
#   teaser: /assets/images/ArcGIS_Origin_Architecture.svg
excerpt: "Choosing between different technologies for creating infrastructure-as-code (IaC) for AWS."
---



# Cloudformation, SAM or Terraform?

When setting up infrastructure-as-code (IaC) for AWS, there are several options to choose from, each with its own strengths and weaknesses. Three popular options are AWS CloudFormation, AWS Serverless Application Model (SAM), and HashiCorp Terraform. Here's a brief overview of each option - and some supporting information for our decision-making process:

## AWS CloudFormation
AWS CloudFormation is a native AWS service that allows you to define and provision AWS infrastructure using JSON or YAML templates. It provides a declarative way to describe your infrastructure, and it supports a wide range of AWS services. CloudFormation is tightly integrated with AWS, making it easy to use for AWS-specific resources. It also supports features like drift detection and stack policies. 
In the AWS console, it's easy to see which resources are managed by CloudFormation, as they will have a "stack" associated with them. Resources created outside of CloudFormation will not have this association.
## AWS Serverless Application Model (SAM)
AWS SAM is an extension of CloudFormation that is specifically designed for building _serverless_ applications. It provides a simplified syntax for defining serverless resources like AWS Lambda functions, API Gateway APIs, and DynamoDB tables. SAM also includes a local development environment and a CLI tool for building, testing, and deploying serverless applications. It is a good choice if you are primarily working with serverless resources and want to take advantage of the additional features that SAM provides.

SAM templates are also CloudFormation templates, so resources created with SAM will also be visible in the AWS console as part of a CloudFormation stack. A neat feature of SAM is the ability to run and test Lambda functions locally, which can speed up development and make debugging considerably easier (than the alternative of making changes to Lambda code in the console). 

I use SAM local inside VSCode, with the AWS Toolkit extension installed (this requires Docker to be installed locally, as SAM uses Docker containers to simulate the Lambda execution environment). With both the AWS CLI and the SAM CLI installed, it's easy to build and deploy serverless applications directly from your local development environment.
## HashiCorp Terraform
HashiCorp Terraform is an open-source IaC tool that allows you to define and provision infrastructure using a high-level configuration language called HashiCorp Configuration Language (HCL). Terraform supports a wide range of cloud providers, including AWS, Azure, and Google Cloud, making it a good choice if you are working in a multi-cloud environment. Terraform also has a large and active community, which means there are many resources available for learning and troubleshooting.

Terraform does not have the same level of integration with AWS as CloudFormation or SAM, but it does support AWS resources through the AWS provider. Resources created with Terraform will not be visible in the AWS console as part of a CloudFormation stack, but they can be managed using the Terraform CLI. Terraform has a state file that keeps track of the resources it manages, which can be stored locally or in a remote backend like AWS S3. This state file is crucial for Terraform to understand the current state of your infrastructure and make necessary updates. It enables features like plan and apply, which help you preview changes before they are made (you will be able to view what changes are planned, a bit like a "diff" in Git or programming environments).
## Conclusion
Choosing between CloudFormation, SAM, and Terraform depends on your specific use case and requirements. If you are primarily working with AWS resources and want a native solution, CloudFormation is a good choice. 

If you are building serverless applications, SAM provides additional features that can simplify development. If you are working in a multi-cloud environment or want a more flexible configuration language, Terraform is a good option. Ultimately, the best choice will depend on your specific needs and preferences.

We've made it a point to prefer Terraform as it provides a consistent workflow across different cloud providers, which is beneficial for our multi-cloud strategy and to provide some level of vendor-independence. 
Additionally, Terraform's state management and plan/apply features offer a level of control and predictability that we find valuable in our infrastructure management processes.

**Tags:** #AWS #Cloudformation #Serverless #SAM #IaC #Terraform #DevOps
