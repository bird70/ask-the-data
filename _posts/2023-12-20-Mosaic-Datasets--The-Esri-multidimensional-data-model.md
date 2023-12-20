---
layout: post
author: steintil
---

# Esri's Mosaic Dataset - a data model for multidimensional raster data

The [Esri Mosaic Dataset](https://pro.arcgis.com/en/pro-app/latest/help/data/imagery/mosaic-datasets.htm) is the underlying fundamental data model which should be used for managing and accessing large numbers of spatial data in raster file format.

It can be used to configure access to immense numbers of raster files in various formats. In many cases, it's used for image rasters, but it is very useful for working with scientific rasters as well, such as weather forecasts or stacked timelines of model output etc.

An old analogy about GIS talks about how in the time before GIS, analysis of layers was by plotting points, lines or polygons on transparencies and stacking them to see where the things coincide or what's near to what other things. This worked reasonably well with smallish numbers of layers and only with the mentioned points, lines and polygons.

To understand how the Mosaic Dataset can be useful, imagine having to work with a large number of rasters in a GIS:

- If you add them all to your map, the table of contents will quickly be cluttered and there won't be a way to search through the rasters or access them for analysis in any meaningful way.
- If your rasters contain data for different attributes but for the same area, then you'll have a stack of rasters of which you can see the top one only. Selecting only the attribute which you are interested in showing as a map requires making all other layers inactive/invisible, leaving only the one for the attribute you want.
- A variation of the above would be to stack rasters which are all for the same area but different points in time. These time slices would be very hard to visualise if you had to deal with, say, dozens, let alone, thousands of rasters.

![Continuous data coverage in a Mosaic Dataset]({{site.url}}/assets/img/GUID-063866C0-4A61-487C-90BE-39CC737495F9-web.png)
![Discontinuous data coverage in a Mosaic Dataset]({{site.url}}/assets/img/GUID-31E04AE1-F88D-41BF-A6B4-E7EB8E5A0853-web.png)

The Mosaic dataset can be thought of as a database where each raster that is added to it becomes a single record. When you request a certain record (or a set of records) to be retrieved from the database, the rest is inactive and you can display the result on your map. To make this possible, rasters are added to the database (mosaic dataset) along with attributes which allow specifying the parameters for a search.

To create a Mosaic dataset interactively and adding rasters as needed is possible in ArcGIS Pro, using the built-in tools, but that process can quickly become cumbersome if you have specific requirements for what the mosaic dataset should contain and how it should behave, especially if you need to continuously add more rasters.

[Esri's Mosaic Dataset Configuration Scripts](https://github.com/esri/mdcs-py) are very handy when it comes to scripting the process, using Python and XML configuration files. There are some examples available for their use, but they are not very sophisticated and I wanted something in Powershell, which allowed me to speed up the process by doing parallel processing, and which wouldn't be overly complicated. The PS script I created uses script arguments to parameterize what MDCS receives as input.

I am providing an example of applying MDCS to create a complex, nested, set of mosaic datasets, configuring them and adding rasters, as well as populating the database with the attributes for all rasters here: [MDCS config scripts](https://github.com/bird70/MDCS_mosaic_dataset_config_scripts)
