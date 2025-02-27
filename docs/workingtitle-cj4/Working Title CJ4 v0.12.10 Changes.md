# Working Title CJ4 v0.12.10
Welcome to the Working Title CJ4 v0.12.10. This version contains a few important fixes for bugs found since the SU7 release.

Thanks to everyone, as always, for your contributions! We really love working with you all.

## Note about Liveries
To accommodate for future work on the CJ4 there have been model changes made to the plane in SU7. This means that all liveries that still fully override panel.cfg with their own version (which they really shouldn't) won't work anymore. 
You will notice a bad livery or other mods interferring by having all white screens in the cockpit.  

Liveries should use the method as described in our [Repainter's Guide](https://www.workingtitle.aero/packages/cj4/guides/repainter).
Many liveries already use that method and should work alright after the update.

## READ THE GUIDE
Please, please, please read the operators guide for instructions on using features. A lot of hard work went into writing the guide and the Discord channels are clogged with questions that are readily answered in the guide.

GUIDES: https://www.workingtitle.aero/packages/cj4/guides/

## Installation
Installation is easy, simply copy the `workingtitle-aircraft-cj4` folder inside the zip file to your MSFS Community folder. 

**Important: We recommend that you fully delete the previous `workingtitle-aircraft-cj4` folder before copying this release.**

## Fixes
- Fixed an issue where ILS would not auto-tune, auto-switch, or track for some ILS frequencies
- LNAV should no longer fail to provide guidance while a flight plan change is pending execution

## ⚠️ Known Issues
* Wing Light Button does not light up.
* The Lower CCP LONG Press does not work for reselecting charts - we will look further at this.
* B/C button throws an error in the FMC - do not use B/C for now.
* Some "lettered" or non-runway-specific approaches now appear as something like RNAV A - 00 and do not allow the selection of a landing runway, preventing using the Approach Refs page - this is something we will be working to address in the future.
* Some external applications that use the GPS/Flight plan SimVars may not function correctly or as expected when FP Sync is off.
* Loading and saving flights can have bad results.
* Custom liveries can render FADEC inoperative if they ship with a panel.cfg. Painters should reference our new [Repainter's Guide](https://www.workingtitle.aero/packages/cj4/guides/repainter) for solutions.
* Autopilot modes cannot be triggered via key bindings or controllers and must currently be triggered in the cockpit with the mouse. External binding applications are adding support for LVars and HEvents. Used SimVars are documented in our [Guide on SimVars](https://www.workingtitle.aero/packages/cj4/guides/simvars).
* Sometimes a heading to altitude instruction on takeoff will display further than the first RNAV fix on an RNAV departure procedure; in these cases the workaround is to cross-check the DP chart and remove the erroneous waypoint either by deleting the heading to altitude fix or dropping the first RNAV fix onto the magenta line in the LEGS page.
* Due to sim autopilot bank rate limitations, the aircraft may overshoot on certain RNP approaches with tight turns. If you encounter this, we recommend hand flying the approach with the given lateral and vertical guidance.
