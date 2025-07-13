# ArcGIS API for Python == easy to run in AWS Lambda?

The ArcGIS API for Python is extremely handy when it comes to manipulating both services and data in either ArcGIS Online or ArcGIS Enterprise. It can be used on Linux or Windows, making it an attractive candidate library to use for geoprocessing scripts.

Recently, I had migrate a script that was running on a Windows server that had ArcGIS Pro installed, so we could scrap the server (and would no longer have to provide an ArcGIS Pro license for the duration of the service running).

My initial thought was to run the process in a container in AWS, possibly using Windows, but that would mean another Windows 'machine' to maintain, and possibly a larger one for that. Could we use a Lambda function to run the geoprocessing? And could that Lambda function be a simple, lightweight, Linux setup, with only the bits installed that are needed to manipulate a dataset and then upload it to ArcGIS Online to become a feature service or image service?

Turns out that the answer is yes, but it was a bit of a juggle - as we also needed some other libraries in this case, and we wanted to keep the Lambda function extra-small. For various Lambda functions to be able to import the ArcGIS library in future, I settled on a custom container, built in Docker locally.

Lambda layers have file size limit (~ 230 MB unzipped), which in my case worked out to be a zipped upload of ca. 90 MB. (Have a look at the install in ArcGIS Pro to get an idea of the size of the ArcGIS API used there - it's way bigger, and that doesn't include the other libraries yet, such as NetCDF, geopackage, numpy, pandas etc. that we needed.

Here's the process used:

1) Use Docker to build a library layer file locally. Use Amazon Linux 2, add what is needed (and remove those parts which we weren't able to include in the package, such as DeepLearning)
2) Download the (zipped) library layer
3) upload to AWS to create a new Lambda layer (file size limit for the uploaded Zip file was not easy to meet)
4) Associate the Lambda layer with a Lambda function (the layer is able to be re-used across many lambda functions)

[AWS ArcGIS Lambda Layer repo](https://github.com/bird70/AWS_ArcGIS_Lambda_Layer)

An example project where the above layer is associated with a Lambda function ArcGIS API script can be found here:

[AWS NetCDF to ArcGIS Online Feature Service](https://github.com/bird70/AWS_NetCDF_2_ArcGIS_Online_Feature/)


