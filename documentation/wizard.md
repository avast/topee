Xcode project wizard
====================

This wizard shows how to setup a Topee-based project from scratch that can be published to the App Store.
A Safari App Extension always has to be embedded in a MacOS application and is distributed as a part of the application.
If you already have an application that you want to add your App Extension into, you can skip the next two sections.

App ID definitions
------------------

If you have not done so already, register at [developer.apple.com](https://developer.apple.com).

Then create your App ID

![App ID](wizard/appid.png)

You also need to define your Provisioning Profiles

![Mac App Store Proisioning Profile](wizard/provisioning.png)

In addition to the Mac App Store Provisioning Profile, setup a Mac App Development Provisioning Profile in a similar fashion.

Xcode project
-------------

A Safari App Extension needs to be embedded in a MacOS app. If the extension does not need any application to work,
such an application usually just leads users to Safari preferences where the extension is enabled manually.

Start Xcode and create the application

![Cocoa app](wizard/xcodeapp.png)

Set the project options. Bundle Id can be changed later on.

![Project options](wizard/bundleid.png)

Ajust the Bundle Id later on to match you the one you have created at [developer.apple.com](https://developer.apple.com)

![Project options](wizard/bundleid2.png)

You might also want to set your deployment target to a slightly lower MacOS version than the default

![OSX version](wizard/deploymenttarget.png)

The Appex and Topee references
------------------------------

Xcode has a Safari Extension target that shall be added to your project

![AppEx target](wizard/xcodeappex.png)
