---
layout: single
author_profile: true
read_time: true
comments: false
share: true
related: true
title: ArcGIS Python or arcpy
date: 2025-07-20
categories:
  - gis
  - python
tags:
  - arcgis
  - arcpy
  - python
toc: false
excerpt: "ArcGIS API (for) Python or arcpy? - a somewhat well-explained story."
---

# Python API (for) ArcGIS or arcpy?

I've been meaning to write this post for a while now, as I often get asked about the differences between the `arcpy` library and the `ArcGIS API for Python`. Both libraries are used to manipulate data in ArcGIS, but they have different use cases and capabilities:

ArcGIS Desktop users will be well familiar with the `arcpy` library, which is used to manipulate data in ArcGIS Desktop. The `arcpy` library is a Python package that provides access to the geoprocessing tools and functions in ArcGIS Desktop. It is a powerful tool for automating GIS tasks and workflows. It has been around for a long time and is well-documented, with a large user community. 

You may know it from ArcMap or ArcGIS Pro. But there's that other Python library, the `ArcGIS API for Python`, which is also used to manipulate data in ArcGIS Online and ArcGIS Enterprise. It is a newer library, but it is quickly gaining popularity. It is a powerful tool for automating GIS tasks and workflows, and it too has a large user community.

## So which one should I use?

The answer to this question depends on your specific use case and requirements. Here are some considerations to help you decide:

- **arcpy** is tightly integrated with ArcGIS Desktop and provides access to the full range of geoprocessing tools and functions. It is a good choice if you are working with ArcGIS Desktop and need to perform complex geoprocessing tasks. It is an important part of ArcGIS Server, too, and you may have seen it used in published Geoprocessing Tools that run on the server, possibly as part of an ArcGIS Enterprise setup. And that's where it gets a bit interesting:
- **ArcGIS API for Python** is designed to work with ArcGIS Online and ArcGIS Enterprise. It provides access to the full range of geoprocessing tools and functions available in these platforms. It is a good choice if you are working with ArcGIS Online or ArcGIS Enterprise and need to perform complex geoprocessing tasks. 
However, it is also able to perform administration tasks, such as managing users, groups, and content in ArcGIS Online or ArcGIS Enterprise.

- If you are working with both ArcGIS Desktop and ArcGIS Online or ArcGIS Enterprise, you may want to use both libraries. The `ArcGIS API for Python` can be used to perform tasks that are not available in `arcpy`, such as managing users, groups, and content in ArcGIS Online or ArcGIS Enterprise.

There are use cases, where you may process data locally first, using `arcpy`, and then upload the results to ArcGIS Online or ArcGIS Enterprise, using the `ArcGIS API for Python`. This is a common pattern when working with large datasets that need to be processed before they can be uploaded to ArcGIS Online or ArcGIS Enterprise. 

Obviously, this requires you to have arcpy installed, and that comes with ArcGIS Pro, which is a paid product. The `ArcGIS API for Python` is available for free and can be installed using pip, so it is a good choice if you are looking for a free option, that can be installed on Linux or Windows alike. (I personally think that this is a great option for serverless computing, such as AWS Lambda, where you can run the `ArcGIS API for Python` in a container without the need for ArcGIS Pro. I have an example of how to do this in my [ArcGIS migration to serverless architecture post]({{ "/gis/cloud/architecture/2025/07/07/ArcGIS_migration_architecture/" | relative_url }}).) 

If you are interested in learning more about the differences between the two libraries, I recommend checking out the [ArcGIS API for Python documentation](https://developers.arcgis.com/python/) and the [arcpy documentation](https://pro.arcgis.com/en/pro-app/latest/arcpy/main/). You could also have a look at my recent post about "ArcGIS API for Python in AWS Lambda", which shows how to use the `ArcGIS API for Python` in a serverless environment, using AWS Lambda ["ArcGIS Python AWS Lambda"]({{ "/gis/cloud/python/2025/07/11/ArcGIS-Python-AWS-Lambda/" | relative_url }}).

