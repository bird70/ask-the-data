---
layout: single
author_profile: true
read_time: true
comments: false
share: true
related: true
title: Arcade Popups in ArcGIS web map, with Conditional Display of Images
date: 2024-01-03
categories:
  - gis
  - scripting
tags:
  - arcgis
  - arcade
  - popups
  - webmap
header:
  image: /assets/images/ArcadeFormattedPopup.jpg
  teaser: /assets/images/ArcadeFormattedPopup.jpg
excerpt: "Using Esri's Arcade script language to populate fields in a web map popup, with conditional display of images and output from feature set query."
---

Happy New Year!

Recently I've used Esri's Arcade script language, which is similar to JavaScript, to populate fields that are displayed in a Web App popup when a user clicks on the map. Arcade is used in the web map configuration.

![Formatted popup with conditional display of images and ]({{ "/assets/images/ArcadeFormattedPopup.jpg" | absolute_url }} "Formatted popup with conditional display of images and output from feature set query (above the image)")
_Figure:_ Formatted popup with conditional display of images and output from feature set query (above the image)

[Arcade script expressions](https://developers.arcgis.com/arcade/) in ArcGIS Web Maps can be used for various tasks, including querying feature layer data and returning results as formatted popups. (So this post refers specifically to the "popup profile" in Arcade.)

It is possible to aggregate data by spatial relationship, combine/group data from multiple layers, combine data from multiple fields etc. for labelling or charting etc., all without modifying the underlying data.

An example of this would be to make the following request to the feature layer when a user clicks on a sample location in the map:

> What `species` is found in this location?
> For the same kind of species, what is the total count of records in the database?
> What are the Minumum and Maximum of another attribute (e.g. `depth`) in the table for this species?

As with other database queries, like SQL and relational databases, the underlying schema needs to be able to support the queries, using indexes, optimised field types etc. Because of the dynamic nature of these queries, web map performance can otherwise become slow and the overall app can therefore feel rather sluggish, so carefully evaluating performance at all steps in the process is necessary: Arcade does not lend itself to all tasks equally well.

Here I am presenting the use of Arcade in a recent project, along with the formatting of fields and configuration to provide a sophisticated popup display in an ArcGIS Experience Builder app.

# Web app and underlying data

[The project where I have used Arcade recently](https://experience.arcgis.com/experience/bc4a9a2332294bb9ae7ee003fdf9c5ca/) (check out the NIC Dashboard) comprises a global dataset of sampling locations of marine biological data which need to be presented to non-specialist users in a publicly accessible, browser app. Datasets will occasionally be appended, so this database is also continuously growing, but at the moment we are dealing with approximated 160.000 records, with a high number of attributes in the table. Attributes and, occasionally, sample Images will need to be displayed in a webmap popup when a user clicks on a sample location. (Sample Images are stored in an external image management system and individual images are only referenced by their ID).

# Feature layer publishing, indexing & basemap

The dataset is obtained as a CSV file, which we've imported into a temporary representation in an 'event' layer in ArcGIS Pro (3.1), using sample X and Y coordinates. As we want to make global data samples visible in the web app, we are using Web Mercator projection which, in this case, is fine in terms of spatial precision etc. and allows us to readily use one of the basemaps that are provided by Esri.

After importing the CSV and overlaying it on the basemap of choice (Ocean), I've published the layer as a hosted feature layer in [ArcGIS Online](https://www.arcgis.com), which takes care of the underlying storage, database etc. and makes our data available as a so-called 'hosted feature layer' which can be accessed via a URL. This layer needs a few extra indexes that will improve query performance in the application. I have created those extra indexes in the settings tab for the feature layer item in ArcGIS Online. (Each index refers to an individual attribute that is queried in the app or using Arcade).

The layer is then shared with the "Everone" option. By making the layer public, we can benefit from Esri's content delivery network (CDN), meaning that it will be quicker to access, query and display from any place by duplicating its storage across a number of geographically spread servers in different locations of the world, thereby eliminating some latency.

# Web Map Configuration

The published hosted feature layer is then added to a 'fresh' new web map, again my choice of basemap is the Ocean Basemap which will provide a good reference for our data. Some basic configuration on the web map will make it more fitting for public use:

## Fields

The fields we want to display in the popup may not have names that can be easily read and understood, so we've created aliases where needed and hidden fields that won't be useful for the user (such as the OBJECTID). Significant digits are set using the required number of decimal places and a thousands separator, where needed. I have also re-ordered some of the attributes and defined one that gets displayed as the Title at the top of the popup.

## Other optimisations (Zoom levels & Clustering):

I am using several different ways to cluster the many data points in the map at different zoom levels. To do this, I have made copies of the original layer after the initial configuration, which are displayed with different zoom level dependencies and using the "Aggregation" setting in the Map Viewer. At the smallest scale, users see coarse rectangles in different hues of red and blue that indicate the total of samples in the rectangular area. This provides a quick overview at a global level of where samples can be found. Rectangle
Zooming in, the rectangle display changes to circular 'blobs' which also show the density of samples in their locations, but this time the size of the circle indicates more or less samples, while the colour remains the same for them all. These 'blobs' are changing dynamically when users zoom in further.

At the largest scales, the display changes to individual sample locations. All points have one of two symbols: Where at least one image is referenced for a record, the symbol is square, all others are round. This is important for our app as users may be particularly interested in the image, if and where available for a particular sample.

The scale dependent clustering described above makes performance feel relatively smooth when zooming in and out and provides sufficient detail at all zoom levels without visually overwhelming users where many samples are found.

## Arcade expressions

Several "Attribute expressions" are defined under the "Options" in the web map "Pop-ups" configuration.

The following expression determines the total number of features in the DB for the species that the clicked sample belongs to. It uses that information to generate a sentence that gets displayed in the popup to inform the user:

```

var alle = FeatureSetByName($datastore,"PROD_feature_layer",['OBJECTID','Preferred_Taxon','Depth1','Depth2'], False)
var spec = $feature.Preferred_Taxon;

var sql = "Preferred_Taxon = '" + spec + "'";
var target = Filter(alle,sql);
var anzahl = Count( target);
var D1
var D2

var largest = ''
var absoluteLargest = ''

for (var row in target) {
    D1 = row["Depth1"]
    D2 = row["Depth2"]

    // Check  both the `Depth1` and `Depth2` attributes and make sure we use the max of the two values, whichever field it is stored in:
    var localMax = Max([D1,D2])


    largest = IIF (localMax > largest, localMax, largest )
    absoluteLargest = IIF (absoluteLargest == '', localMax, absoluteLargest)
    absoluteLargest = IIF ( localMax > absoluteLargest, localMax, absoluteLargest )


}

anzahl +  " specimens of this taxon in the NIC have been found at maximum depths up to "  + absoluteLargest + " m."
```

In order to display the content returned by the attribute expression, it will be referenced in a custom field in the popup by the name of the expression.

Several almost identical expressions are used to determine whether or not image IDs are referenced in the "Specimen_Image_NN" fields:

```
IIF(IsEmpty($feature["Specimen_Image_1"]), "none", "block");

```

The above expression (called `expression/expr1`) is used in the custom HTML below for populating an HTML table with pointers to the image that are going to be used by the users' browser to display images where they exist. Basically the expression means "Display nothing if the required field is empty, otherwise display something (a block).

## Custom HTML fields

We want to display images only when they are referenced in the record - otherwise nothing should be displayed. That's what we have used Arcade for: an expression is run for each of the `imageNN` attributes to determine whether or not there is content there. Below the <img style="display:{expression/expr1}"> option defines a style where the image is added if an entry is there in the `Specimen_Image_1` attribute, as defined above, or alternatively a style of `none` (which renders the table row invisible, essentially eliminating unnecessary rows).

The following HTML code generates the (invisible) table in which images are displayed in the popup, depending on the Arcade expressions and creates a link to display the image. This helps achieving a tidy format for the image display (this can be used in a new 'Text' field for the popup, after switching to 'Source' display in the popup configuration dialogue in ArcGIS Online):

```
<figure>
    <figure>
        <figure>
            <figure class="table">
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <img style="display:{expression/expr1};" src="https://imagehost.com/login/SearchService?SERVICE_REQUEST_TYPE=3&amp;SERVICE_REQUEST_USERID=833&amp;SERVICE_REQUEST_PASSKEY=public&amp;SERVICE_REQUEST_ASSETID={Specimen_Image_1}" alt="Specimen Image [1]">
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <img style="display:{expression/expr2};" src="https://imagehost.com/login/SearchService?SERVICE_REQUEST_TYPE=3&amp;SERVICE_REQUEST_USERID=833&amp;SERVICE_REQUEST_PASSKEY=public&amp;SERVICE_REQUEST_ASSETID={Specimen_Image_2}" alt="Specimen Image [2]">
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <img style="display:{expression/expr3};" src="https://imagehost.com/login/SearchService?SERVICE_REQUEST_TYPE=3&amp;SERVICE_REQUEST_USERID=833&amp;SERVICE_REQUEST_PASSKEY=public&amp;SERVICE_REQUEST_ASSETID={Specimen_Image_3}" alt="Specimen Image [3]">
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <img style="display:{expression/expr4};" src="https://imagehost.com/login/SearchService?SERVICE_REQUEST_TYPE=3&amp;SERVICE_REQUEST_USERID=833&amp;SERVICE_REQUEST_PASSKEY=public&amp;SERVICE_REQUEST_ASSETID={Specimen_Image_4}" alt="Specimen Image [4]">
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <img style="display:{expression/expr5};" src="https://imagehost.com/login/SearchService?SERVICE_REQUEST_TYPE=3&amp;SERVICE_REQUEST_USERID=833&amp;SERVICE_REQUEST_PASSKEY=public&amp;SERVICE_REQUEST_ASSETID={Specimen_Image_5}" alt="Specimen Image [5]">
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <img style="display:{expression/expr6};" src="https://imagehost.com/login/SearchService?SERVICE_REQUEST_TYPE=3&amp;SERVICE_REQUEST_USERID=833&amp;SERVICE_REQUEST_PASSKEY=public&amp;SERVICE_REQUEST_ASSETID={Specimen_Image_6}" alt="Specimen Image [6]">
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <img style="display:{expression/expr7};" src="https://imagehost.com/login/SearchService?SERVICE_REQUEST_TYPE=3&amp;SERVICE_REQUEST_USERID=833&amp;SERVICE_REQUEST_PASSKEY=public&amp;SERVICE_REQUEST_ASSETID={Specimen_Image_7}" alt="Specimen Image [7]">
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <img style="display:{expression/expr8};" src="https://imagehost.com/login/SearchService?SERVICE_REQUEST_TYPE=3&amp;SERVICE_REQUEST_USERID=833&amp;SERVICE_REQUEST_PASSKEY=public&amp;SERVICE_REQUEST_ASSETID={Specimen_Image_8}" alt="Specimen Image [8]">
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <img style="display:{expression/expr9};" src="https://imagehost.com/login/SearchService?SERVICE_REQUEST_TYPE=3&amp;SERVICE_REQUEST_USERID=833&amp;SERVICE_REQUEST_PASSKEY=public&amp;SERVICE_REQUEST_ASSETID={Specimen_Image_9}" alt="Specimen Image [9]">
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <img style="display:{expression/expr10};" src="https://imagehost.com/login/SearchService?SERVICE_REQUEST_TYPE=3&amp;SERVICE_REQUEST_USERID=833&amp;SERVICE_REQUEST_PASSKEY=public&amp;SERVICE_REQUEST_ASSETID={Specimen_Image_10}" alt="Specimen Image [10]">
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <img style="display:{expression/expr11};" src="https://imagehost.com/login/SearchService?SERVICE_REQUEST_TYPE=3&amp;SERVICE_REQUEST_USERID=833&amp;SERVICE_REQUEST_PASSKEY=public&amp;SERVICE_REQUEST_ASSETID={Specimen_Image_11}" alt="Specimen Image [11]">
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <img style="display:{expression/expr12};" src="https://imagehost.com/login/SearchService?SERVICE_REQUEST_TYPE=3&amp;SERVICE_REQUEST_USERID=833&amp;SERVICE_REQUEST_PASSKEY=public&amp;SERVICE_REQUEST_ASSETID={Specimen_Image_12}" alt="Specimen Image [12]">
                            </td>
                        </tr>
                    </tbody>
                </table>
            </figure>
        </figure>
    </figure>
</figure>
```
