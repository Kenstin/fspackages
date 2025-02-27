// TODO this should be in TS or something, but somehow it doesnt work, so put it here for just now
const ngApi = new NavigraphApi();

class CJ4_FMC extends FMCMainDisplay {
    constructor() {
        super(...arguments);
        this._registered = false;
        this._isRouteActivated = false;
        this._lastUpdateTime = NaN;
        this.refreshFlightPlanCooldown = 0;
        this.updateAutopilotCooldown = 0;
        this._hasSwitchedToHoldOnTakeOff = false;
        this._previousApMasterStatus = false;
        this._apMasterStatus = false;
        this._apHasDeactivated = false;
        this._hasReachedTopOfDescent = false;
        this._apCooldown = 500;
        this._wasInAltMode = false;
        this.reserveFuel = 750;
        this.paxNumber = 0;
        this.cargoWeight = 0;
        this.basicOperatingWeight = 10280;
        this.grossWeight = 10280;
        this.zFWActive = 0;
        this.zFWPilotInput = 0;
        this.gWTActive = 0;
        this.gWTPilotInput = 0;
        this.takeoffOat = "□□□";
        this.landingOat = "□□□";
        this.takeoffQnh = "□□.□□";
        this.landingQnh = "□□.□□";
        this.takeoffWindDir = "---";
        this.takeoffWindSpeed = "---";
        this.landingWindDir = "---";
        this.landingWindSpeed = "---";
        this.takeoffPressAlt = "";
        this.landingPressAlt = "";
        this.depRunwayCondition = 0;
        this.arrRunwayCondition = 0;
        this.takeoffFlaps = 15;
        this.takeoffAntiIce = 0;
        this.landingAntiIce = 0;
        this.landingFactor = 0;
        this.endTakeoffDist = 0;
        this.takeoffRwySlope = 0;
        this.landingRwySlope = 0;
        this.initialFuelLeft = 0;
        this.initialFuelRight = 0;
        this.selectedRunwayOutput = "";
        this.toVSpeedStatus = CJ4_FMC.VSPEED_STATUS.NONE;
        this.appVSpeedStatus = CJ4_FMC.VSPEED_STATUS.NONE;
        this._fpHasChanged = false;
        this._activatingDirectTo = false;
        this._templateRenderer = undefined;
        this._msg = "";
        this._activatingDirectToExisting = false;
        this.vfrLandingRunway = undefined;
        this.vfrRunwayExtension = undefined;
        this.modVfrRunway = false;
        this.deletedVfrLandingRunway = undefined;

        this.selectedWaypoint = undefined;
        this.selectMode = CJ4_FMC_LegsPage.SELECT_MODE.NONE;
        SimVar.SetSimVarValue("TRANSPONDER STATE:1", "number", 1);
        this.currentInput = undefined;
        this.previousInput = undefined;
        this._frameUpdates = 0;
        this._currentVerticalAutopilot = undefined;
        this._vnav = undefined;
        this._lnav = undefined;
        /** @type {CJ4_SpeedObserver} */
        this._speedObs = undefined;
        this._altAlertState = CJ4_FMC.ALTALERT_STATE.NONE;
        this._altAlertCd = 500;
        this._altAlertPreselect = 0;
        this._msgUpdateCd = 500;
        SimVar.SetSimVarValue("L:WT_CJ4_INHIBIT_SEQUENCE", "number", 0);
        SimVar.SetSimVarValue("L:WT_CJ4_TFC_ALT_ABOVE_ENABLED", "number", 1);
        SimVar.SetSimVarValue("L:WT_CJ4_TFC_ALT_BELOW_ENABLED", "number", 1);
        SimVar.SetSimVarValue("L:AS3000_Brightness", "number", 2.0);
        this._nearest = undefined;
        /** @type {CJ4_FMC_NavigationService} */
        this._navigationService = new CJ4_FMC_NavigationService(this);
        /** @type {CJ4_FMC_MessageReceiver} */
        this._fmcMsgReceiver = new CJ4_FMC_MessageReceiver();
        MessageService.getInstance().registerReceiver(MESSAGE_TARGET.FMC, this._fmcMsgReceiver);
        /** @type {CJ4_PFD_MessageReceiver} */
        this._pfdMsgReceiver = new CJ4_PFD_MessageReceiver();
        MessageService.getInstance().registerReceiver(MESSAGE_TARGET.PFD_TOP, this._pfdMsgReceiver);
        MessageService.getInstance().registerReceiver(MESSAGE_TARGET.PFD_BOT, this._pfdMsgReceiver);
        this.userMsg = "";

        this._navRadioSystem = new CJ4_NavRadioSystem();
        this._pilotWaypoints = undefined;
    }

    get templateID() {
        return "CJ4_FMC";
    }

    // Property for EXEC handling
    get fpHasChanged() {
        return this._fpHasChanged;
    }
    set fpHasChanged(value) {
        this._fpHasChanged = value;
        if (this._fpHasChanged) {
            this._templateRenderer.showExec();
        } else {
            this._templateRenderer.hideExec();
        }
    }

    updateRouteOrigin(newRouteOrigin, callback = EmptyCallback.Boolean) {
        this.dataManager.GetAirportByIdent(newRouteOrigin).then(airport => {
            if (!airport) {
                this.showErrorMessage("NOT IN DATABASE");
                return callback(false);
            }
            this.flightPlanManager.setOrigin(airport.icao, () => {
                this.tmpOrigin = airport.ident;
                callback(true);
            });
        });
    }

    connectedCallback() {
        super.connectedCallback();
        this.radioNav.init(NavMode.TWO_SLOTS);
        if (!this._registered) {
            RegisterViewListener("JS_LISTENER_KEYEVENT", () => {
                console.log("JS_LISTENER_KEYEVENT registered.");
                RegisterViewListener("JS_LISTENER_FACILITY", () => {
                    console.log("JS_LISTENER_FACILITY registered.");
                    this._registered = true;
                });
            });

            this.addEventListener("FlightStart", async function () {
                if (localStorage.length > 0) {
                    localStorage.clear();
                }
            }.bind(this));
        }
    }

    Init() {
        super.Init();

        // Maybe this gets rid of slowdown on first fpln mod
        this.flightPlanManager.copyCurrentFlightPlanInto(1);

        // init WT_FMC_Renderer.js
        this._templateRenderer = new WT_FMC_Renderer(this);

        // check for pos init message
        if (this.lastPos === "") {
            MessageService.getInstance().post(FMS_MESSAGE_ID.INIT_POS, () => {
                return this.lastPos !== "";
            });
        }

        this.maxCruiseFL = 450;
        this.onFplan = () => {
            CJ4_FMC_RoutePage.ShowPage1(this);
        };
        this.onLegs = () => {
            CJ4_FMC_LegsPage.ShowPage1(this);
        };
        this.onIdx = () => {
            CJ4_FMC_InitRefIndexPage.ShowPage1(this);
        };
        this.onDepArr = () => {
            CJ4_FMC_DepArrPage.ShowPage1(this);
        };
        this.onDsplMenu = () => {
            CJ4_FMC_DsplMenuPage.ShowPage1(this);
        };
        this.onPerf = () => {
            CJ4_FMC_PerfInitPage.ShowPage1(this);
        };
        this.onMfdAdv = () => {
            CJ4_FMC_MfdAdvPage.ShowPage1(this);
        };
        this.onTun = () => {
            const AvionicsComp = SimVar.GetSimVarValue("L:XMLVAR_AVIONICS_IsComposite", "number");
            if (AvionicsComp == 1) {
                CJ4_FMC_NavRadioDispatch.Dispatch(this);
            } else {
                CJ4_FMC_NavRadioPage.ShowPage1(this);
            };
        };
        this.onExec = () => {
            if (this.onExecPage) {
                console.log("if this.onExecPage");
                this.onExecPage();
            } else {
                this._isRouteActivated = false;
                this.fpHasChanged = false;
                this._activatingDirectTo = false;
            }
        };
        this.onExecPage = undefined;
        this.onExecDefault = () => {
            if (this.getIsRouteActivated() && !this._activatingDirectTo) {
                this.insertTemporaryFlightPlan(() => {
                    this.copyAirwaySelections();
                    this._isRouteActivated = false;
                    this._activatingDirectToExisting = false;
                    this.fpHasChanged = false;
                    SimVar.SetSimVarValue("L:FMC_EXEC_ACTIVE", "number", 0);
                    if (this.refreshPageCallback) {
                        this.refreshPageCallback();
                    }
                });
            } else if (this.getIsRouteActivated() && this._activatingDirectTo) {
                const activeIndex = this.flightPlanManager.getActiveWaypointIndex();
                this.insertTemporaryFlightPlan(() => {
                    this.flightPlanManager.activateDirectToByIndex(activeIndex, () => {
                        this.copyAirwaySelections();
                        this._isRouteActivated = false;
                        this._activatingDirectToExisting = false;
                        this._activatingDirectTo = false;
                        this.fpHasChanged = false;
                        SimVar.SetSimVarValue("L:FMC_EXEC_ACTIVE", "number", 0);
                        if (this.refreshPageCallback) {
                            this.refreshPageCallback();
                        }
                    });
                });
            } else {
                this.fpHasChanged = false;
                this._isRouteActivated = false;
                SimVar.SetSimVarValue("L:FMC_EXEC_ACTIVE", "number", 0);
                if (this.refreshPageCallback) {
                    this._activatingDirectTo = false;
                    this.fpHasChanged = false;
                    this.refreshPageCallback();
                }
            }
        };

        this.onMsg = () => {
            this._navigationService.showPage(CJ4_FMC_MsgPage);
        };

        CJ4_FMC_InitRefIndexPage.ShowPage5(this);

        //Timer for periodic page refresh
        this._pageRefreshTimer = null;

        //Hijaack and amend the standard FMC logic to work with the PL21 TUNE page
        const initRadioNav = super.initRadioNav.bind(this);
        this.initRadioNav = (_boot) => {
            initRadioNav(_boot);
            this.initializeStandbyRadios(_boot);
        };

        // get HideYoke
        const yokeHide = WTDataStore.get('WT_CJ4_HideYoke', 1);
        SimVar.SetSimVarValue("L:XMLVAR_YOKEHidden1", "number", yokeHide);
        SimVar.SetSimVarValue("L:XMLVAR_YOKEHidden2", "number", yokeHide);

        // load persisted heading
        const hdg = WTDataStore.get("AP_HEADING", 0);
        Coherent.call("HEADING_BUG_SET", 1, hdg);

        // set pos if battery already on
        const batteryOn = SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "bool");
        if (batteryOn) {
            const fmsPos = new LatLong(SimVar.GetSimVarValue("GPS POSITION LAT", "degree latitude"), SimVar.GetSimVarValue("GPS POSITION LON", "degree longitude")).toDegreeString();
            this.tryUpdateIrsCoordinatesDisplay(fmsPos);
        }

        // set constraint altitude to 0 on flight start/FMC reboot
        SimVar.SetSimVarValue("L:WT_CJ4_CONSTRAINT_ALTITUDE", "number", 0);

        const fuelWeight = SimVar.GetSimVarValue("FUEL WEIGHT PER GALLON", "pounds");
        this.initialFuelLeft = Math.trunc(SimVar.GetSimVarValue("FUEL LEFT QUANTITY", "gallons") * fuelWeight);
        this.initialFuelRight = Math.trunc(SimVar.GetSimVarValue("FUEL RIGHT QUANTITY", "gallons") * fuelWeight);

        this._navRadioSystem.initialize();

        this._pilotWaypoints = new CJ4_FMC_PilotWaypoint_Manager(this);
        this._pilotWaypoints.activate();
    }
    onUpdate(_deltaTime) {
        super.onUpdate(_deltaTime);

        const now = performance.now();
        const dt = now - this._lastUpdateTime;
        this._lastUpdateTime = now;

        this._navRadioSystem.update();
        this.updateAutopilot(dt);
        this.updateNearestAirports(dt);
        this.adjustFuelConsumption();
        this.updateFlightLog();
        this.updateCabinLights();
        this.updatePersistentHeading();
        this.updateAlerters(dt);
        this.updateMsgs(_deltaTime);
        this._frameUpdates++;
        if (this._frameUpdates > 64000) {
            this._frameUpdates = 0;
        }
    }
    onInputAircraftSpecific(input) {
        // console.log("CJ4_FMC.onInputAircraftSpecific input = '" + input + "'");
        this.previousInput = this.currentInput;
        this.currentInput = input;
        if (input === "LEGS") {
            if (this.onLegs) {
                this.onLegs();
            }
            return true;
        }
        if (input === "FPLN") {
            if (this.onFplan) {
                this.onFplan();
            }
            return true;
        }
        if (input === "DSPL_MENU") {
            if (this.onDsplMenu) {
                this.onDsplMenu();
            }
            return true;
        }
        if (input === "IDX") {
            if (this.onIdx) {
                this.onIdx();
            }
            return true;
        }
        if (input === "PERF") {
            if (this.onPerf) {
                this.onPerf();
            }
            return true;
        }
        if (input === "MFD_ADV") {
            if (this.onMfdAdv) {
                this.onMfdAdv();
            }
            return true;
        }
        if (input === "TUN") {
            if (this.onTun) {
                this.onTun();
            }
            return true;
        }
        if (input === "DIR") {
            CJ4_FMC_DirectToPage.ShowPage1(this);
        }
        if (input === "EXEC") {
            if (this.onExec) {
                this.onExec();
            }
            return true;
        }
        if (input === "MSG") {
            if (this.onMsg) {
                this.onMsg();
            }
            return true;
        }

        return false;
    }

    onInteractionEvent(args) {
        // hack in support for co pilot keypad
        args[0] = args[0].replace(/^CJ4_FMC_2/, "CJ4_FMC_1");
        // console.log("onInteractionEvent args = '" + args + "'");
        super.onInteractionEvent(args);

        const apPrefix = "WT_CJ4_AP_";
        if (args[0].startsWith(apPrefix)) {
            this._navModeSelector.onNavChangedEvent(args[0].substring(apPrefix.length));
        } else if(args[0] == "CJ4_FMC_1_BTN_CLR_Long"){
            this._templateRenderer.clearUserInput.apply(this);
        }
    }

    //Overwrite of FMCMainDisplay to disable always settings nav hold to GPS mode
    updateRadioNavState() {
        if (this.isPrimary) {
            const radioNavOn = this.isRadioNavActive();
            if (radioNavOn != this._radioNavOn) {
                this._radioNavOn = radioNavOn;
                if (!radioNavOn) {
                    this.initRadioNav(false);
                }
                if (this.refreshPageCallback) {
                    this.refreshPageCallback();
                }
            }
            let apNavIndex = 1;
            const apprHold = SimVar.GetSimVarValue("AUTOPILOT APPROACH HOLD", "Bool");
            if (apprHold) {
                if (this.canSwitchToNav()) {
                    let navid = 0;
                    const ils = this.radioNav.getBestILSBeacon();
                    if (ils.id > 0) {
                        navid = ils.id;
                    } else {
                        const vor = this.radioNav.getBestVORBeacon();
                        if (vor.id > 0) {
                            navid = vor.id;
                        }
                    }
                    if (navid > 0) {
                        apNavIndex = navid;
                    }
                }
            }
            if (apNavIndex != this._apNavIndex) {
                SimVar.SetSimVarValue("K:AP_NAV_SELECT_SET", "number", apNavIndex);
                this._apNavIndex = apNavIndex;
            }
        }
    }

    setMsg(value = "") {
        this.userMsg = value;
        if (value === "") {
            this.setFmsMsg();
        } else {
            this._templateRenderer.setMsg(value);
        }
    }

    setFmsMsg(value = "") {
        if (value === "") {
            if (this._fmcMsgReceiver.hasMsg()) {
                value = this._fmcMsgReceiver.getMsgText();
            }
        }
        if (value !== this._msg) {
            this._msg = value;
            if (this.userMsg === "") {
                this._templateRenderer.setMsg(value);
            }
        }
    }

    clearDisplay() {
        super.clearDisplay();
        this._templateRenderer.clearDisplay.apply(this);
        this.onPrevPage = EmptyCallback.Void;
        this.onNextPage = EmptyCallback.Void;
        this.unregisterPeriodicPageRefresh();

        for (let k = 0; k < 6; k++) {
            this.onLeftInput[k] = () => {
                this.showErrorMessage('KEY NOT ACTIVE');
            };
            this.onRightInput[k] = () => {
                this.showErrorMessage('KEY NOT ACTIVE');
            };
        }
    }

    getOrSelectWaypointByIdent(ident, callback) {
        this.dataManager.GetWaypointsByIdent(ident).then((waypoints) => {
            const uniqueWaypoints = new Map();
            waypoints.forEach(wp => {
                if (wp && wp.ident === ident) {
                    uniqueWaypoints.set(wp.icao, wp);
                }
            });
            waypoints = [...uniqueWaypoints.values()];
            if (!waypoints || waypoints.length === 0) {
                return callback(undefined);
            }
            if (waypoints.length === 1) {
                this.facilityLoader.UpdateFacilityInfos(waypoints[0]).then(() => {
                    return callback(waypoints[0]);
                });
            } else {
                CJ4_FMC_SelectWptPage.ShowPage(this, waypoints, ident, selectedWaypoint => {
                    this.facilityLoader.UpdateFacilityInfos(selectedWaypoint).then(() => {
                        return callback(selectedWaypoint);
                    });
                });
            }
        });
    }
    updateSideButtonActiveStatus() {
    }

    getIsRouteActivated() {
        return this._isRouteActivated;
    }
    activateRoute(directTo = false, callback = EmptyCallback.Void) {
        if (directTo) {
            this._activatingDirectTo = true;
        }
        this._isRouteActivated = true;
        this.fpHasChanged = true;
        SimVar.SetSimVarValue("L:FMC_EXEC_ACTIVE", "number", 1);
        this.setMsg();
        callback();
    }

    //function added to set departure enroute transition index
    setDepartureEnrouteTransitionIndex(departureEnrouteTransitionIndex, callback = EmptyCallback.Boolean) {
        this.ensureCurrentFlightPlanIsTemporary(() => {
            this.flightPlanManager.setDepartureEnRouteTransitionIndex(departureEnrouteTransitionIndex, () => {
                callback(true);
            });
        });
    }
    //function added to set arrival runway transition index
    setArrivalRunwayTransitionIndex(arrivalRunwayTransitionIndex, callback = EmptyCallback.Boolean) {
        this.ensureCurrentFlightPlanIsTemporary(() => {
            this.flightPlanManager.setArrivalRunwayIndex(arrivalRunwayTransitionIndex, () => {
                callback(true);
            });
        });
    }
    //function added to set arrival and runway transition
    setArrivalAndRunwayIndex(arrivalIndex, enrouteTransitionIndex, callback = EmptyCallback.Boolean) {
        this.ensureCurrentFlightPlanIsTemporary(() => {
            let landingRunway = this.vfrLandingRunway;
            if (landingRunway === undefined) {
                landingRunway = this.flightPlanManager.getApproachRunway();
            }
            this.flightPlanManager.setArrivalProcIndex(arrivalIndex, () => {
                this.flightPlanManager.setArrivalEnRouteTransitionIndex(enrouteTransitionIndex, () => {
                    if (landingRunway) {
                        const arrival = this.flightPlanManager.getArrival();
                        const arrivalRunwayIndex = arrival.runwayTransitions.findIndex(t => {
                            return t.name.indexOf(landingRunway.designation) != -1;
                        });
                        if (arrivalRunwayIndex >= -1) {
                            return this.flightPlanManager.setArrivalRunwayIndex(arrivalRunwayIndex, () => {
                                return callback(true);
                            });
                        }
                    }
                    return callback(true);
                });
            });
        });
    }

    updateAutopilot(dt) {
        if (isFinite(dt)) {
            this.updateAutopilotCooldown -= dt;
        }
        if (SimVar.GetSimVarValue("L:AIRLINER_FMC_FORCE_NEXT_UPDATE", "number") === 1) {
            SimVar.SetSimVarValue("L:AIRLINER_FMC_FORCE_NEXT_UPDATE", "number", 0);
            this.updateAutopilotCooldown = -1;
        }
        if (this.updateAutopilotCooldown < 0) {
            const currentApMasterStatus = SimVar.GetSimVarValue("AUTOPILOT MASTER", "boolean");
            if (currentApMasterStatus != this._apMasterStatus) {
                this._apMasterStatus = currentApMasterStatus;
            }
            this._apHasDeactivated = !currentApMasterStatus && this._previousApMasterStatus;
            this._previousApMasterStatus = currentApMasterStatus;

            if (!this._navModeSelector) {
                this._navModeSelector = new CJ4NavModeSelector(this.flightPlanManager);
            }

            if (!this._navToNavTransfer) {
                this._navToNavTransfer = new NavToNavTransfer(this.flightPlanManager, this._navRadioSystem, this._navModeSelector);
            }

            this._navToNavTransfer.update(dt);

            //RUN VNAV ALWAYS
            if (this._vnav === undefined) {
                this._vnav = new WT_BaseVnav(this.flightPlanManager, this);
                this._vnav.activate();
            } else {
                try {
                    this._vnav.update();
                } catch (error) {
                    console.error(error);
                }
            }

            //RUN LNAV ALWAYS
            if (this._lnav === undefined) {
                this._lnav = new LNavDirector(this.flightPlanManager, this._navModeSelector);
            } else {
                try {
                    this._lnav.update();
                } catch (error) {
                    console.error(error);
                }
            }

            this._navModeSelector.generateInputDataEvents();
            this._navModeSelector.processEvents();

            //RUN VERTICAL AP ALWAYS
            if (this._currentVerticalAutopilot === undefined) {
                this._currentVerticalAutopilot = new WT_VerticalAutopilot(this._vnav, this._navModeSelector);
                this._currentVerticalAutopilot.activate();
            } else {
                try {
                    this._currentVerticalAutopilot.update();
                } catch (error) {
                    console.error(error);
                }
            }

            // RUN SPEED RESTRICTION OBSERVER
            if (this._speedObs === undefined) {
                this._speedObs = new CJ4_SpeedObserver(this.flightPlanManager);
            } else {
                try {
                    this._speedObs.update();
                } catch (error) {
                    console.error(error);
                }
            }

            SimVar.SetSimVarValue("SIMVAR_AUTOPILOT_AIRSPEED_MIN_CALCULATED", "knots", Simplane.getStallProtectionMinSpeed());
            SimVar.SetSimVarValue("SIMVAR_AUTOPILOT_AIRSPEED_MAX_CALCULATED", "knots", Simplane.getMaxSpeed(Aircraft.CJ4));

            //TAKEOFF MODE HEADING SET (constant update to current heading when on takeoff roll)
            if (this._navModeSelector.currentLateralActiveState === LateralNavModeState.TO && Simplane.getIsGrounded()) {
                Coherent.call("HEADING_BUG_SET", 2, SimVar.GetSimVarValue('PLANE HEADING DEGREES MAGNETIC', 'Degrees'));
            }

            //CHECK FOR ALT set >45000
            if (SimVar.GetSimVarValue("AUTOPILOT ALTITUDE LOCK VAR:1", "feet") > 45000) {
                Coherent.call("AP_ALT_VAR_SET_ENGLISH", 1, 45000, true);
            }
            this.updateAutopilotCooldown = this._apCooldown;
        }
    }

    /**
    * Method to maintain a nearest airport list - this method is called in the update loop and calls the CJ4_FMC_Nearest class.
    */
    updateNearestAirports(dt) {
        if (this._nearest === undefined) {
            this._nearest = new CJ4_FMC_Nearest(this);
            this._nearest.activate();
            this._nearest.nearestCooldown = this._nearest._nearestCooldownTimer;
            this._nearest._ranGetRunways = false;
        }
        if (isFinite(dt)) {
            this._nearest.nearestCooldown -= dt;
        }
        if (this._nearest.nearestCooldown < 0) {
            this._nearest.update();
            this._nearest.nearestCooldown = this._nearest._nearestCooldownTimer;
            this._nearest._ranGetRunways = false;
        } else if (this._nearest.nearestCooldown < 24500 && !this._nearest._ranGetRunways) {
            this._nearest.getRunways();
            this._nearest._ranGetRunways = true;
        }

    }

    // driveFlightDirector(deltaAngle, bank = 0) {
    //     bank = 1.5 * deltaAngle;
    //     bank = bank < -30 ? -30 : bank > 30 ? 30 : bank;
    //     SimVar.SetSimVarValue("L:WT_FLIGHT_DIRECTOR_BANK", "number", bank);
    // }

    //add new method to find correct runway designation (with leading 0)
    getRunwayDesignation(selectedRunway) {
        if (selectedRunway) {
            const selectedRunwayDesignation = new String(selectedRunway.designation);
            const selectedRunwayMod = new String(selectedRunwayDesignation.slice(-1));
            if (selectedRunwayMod == "L" || selectedRunwayMod == "C" || selectedRunwayMod == "R") {
                if (selectedRunwayDesignation.length == 2) {
                    this.selectedRunwayOutput = "0" + selectedRunwayDesignation;
                } else {
                    this.selectedRunwayOutput = selectedRunwayDesignation;
                }
            } else {
                if (selectedRunwayDesignation.length == 2) {
                    this.selectedRunwayOutput = selectedRunwayDesignation;
                } else {
                    this.selectedRunwayOutput = "0" + selectedRunwayDesignation;
                }
            }
        }
        return this.selectedRunwayOutput;
    }
    //end of new method to find runway designation

    /**
     * Registers a periodic page refresh with the FMC display.
     * @param {number} interval The interval, in ms, to run the supplied action.
     * @param {function} action An action to run at each interval. Can return a bool to indicate if the page refresh should stop.
     * @param {boolean} runImmediately If true, the action will run as soon as registered, and then after each
     * interval. If false, it will start after the supplied interval.
     */
    registerPeriodicPageRefresh(action, interval, runImmediately) {
        this.unregisterPeriodicPageRefresh();

        const refreshHandler = () => {
            const isBreak = action();
            if (isBreak) {
                return;
            }
            this._pageRefreshTimer = setTimeout(refreshHandler, interval);
        };

        if (runImmediately) {
            refreshHandler();
        } else {
            this._pageRefreshTimer = setTimeout(refreshHandler, interval);
        }
    }

    /**
     * Unregisters a periodic page refresh with the FMC display.
     */
    unregisterPeriodicPageRefresh() {
        if (this._pageRefreshTimer) {
            clearInterval(this._pageRefreshTimer);
        }
    }

    /**
     * Initializes the standby radios in the FMC.
     * @param {Boolean} isFirstBoot
     */
    initializeStandbyRadios(isFirstBoot) {
        if (this.isPrimary) {
            if (isFirstBoot) {
                this.rcl1Frequency = this.radioNav.getVHFStandbyFrequency(this.instrumentIndex, 1);
                this.pre2Frequency = this.radioNav.getVHFStandbyFrequency(this.instrumentIndex, 2);
            } else {
                if (Math.abs(this.radioNav.getVHFStandbyFrequency(this.instrumentIndex, 1) - this.rcl1Frequency) > 0.005) {
                    this.radioNav.setVHFStandbyFrequency(this.instrumentIndex, 1, this.rcl1Frequency);
                }
                if (Math.abs(this.radioNav.getVHFStandbyFrequency(this.instrumentIndex, 2) - this.pre2Frequency) > 0.005) {
                    this.radioNav.setVHFStandbyFrequency(this.instrumentIndex, 2, this.pre2Frequency);
                }
            }
        }
    }

    /**
     * Adjusts fuel consumption by returning fuel to the tanks and updates the
     * local fuel consumption lvar.
     */
    adjustFuelConsumption() {
        const leftFuelQty = SimVar.GetSimVarValue("FUEL LEFT QUANTITY", "gallons");
        const rightFuelQty = SimVar.GetSimVarValue("FUEL RIGHT QUANTITY", "gallons");

        if (this.previousRightFuelQty === undefined && this.previousLeftFuelQty === undefined) {
            this.previousLeftFuelQty = leftFuelQty;
            this.previousRightFuelQty = rightFuelQty;
        } else {
            const thrustLeft = SimVar.GetSimVarValue("TURB ENG JET THRUST:1", "pounds");
            const thrustRight = SimVar.GetSimVarValue("TURB ENG JET THRUST:2", "pounds");

            const pphLeft = SimVar.GetSimVarValue("ENG FUEL FLOW PPH:1", "pounds per hour");
            const pphRight = SimVar.GetSimVarValue("ENG FUEL FLOW PPH:2", "pounds per hour");

            const leftFuelUsed = this.previousLeftFuelQty - leftFuelQty;
            const rightFuelUsed = this.previousRightFuelQty - rightFuelQty;

            const mach = SimVar.GetSimVarValue("AIRSPEED MACH", "mach");
            const tsfc = Math.pow(1 + (1.2 * mach), mach) * 0.58; //Inspiration: https://onlinelibrary.wiley.com/doi/pdf/10.1002/9780470117859.app4

            const leftFuelFlow = pphLeft > 5 ? Math.max(thrustLeft * tsfc, 150) : 0;
            const rightFuelFlow = pphRight > 5 ? Math.max(thrustRight * tsfc, 150) : 0;

            SimVar.SetSimVarValue("L:CJ4 FUEL FLOW:1", "pounds per hour", leftFuelFlow);
            SimVar.SetSimVarValue("L:CJ4 FUEL FLOW:2", "pounds per hour", rightFuelFlow);

            if ((rightFuelUsed > 0.005 && rightFuelUsed < 1) || (leftFuelUsed > 0.005 && rightFuelUsed < 1)) {

                let leftCorrectionFactor = 1;
                let rightCorrectionFactor = 1;

                if (pphLeft > 0) {
                    leftCorrectionFactor = leftFuelFlow / pphLeft;
                }

                if (pphRight > 0) {
                    rightCorrectionFactor = rightFuelFlow / pphRight;
                }

                const newLeftFuelQty = this.previousLeftFuelQty - (leftFuelUsed * leftCorrectionFactor);
                const newRightFuelQty = this.previousRightFuelQty - (rightFuelUsed * rightCorrectionFactor);

                SimVar.SetSimVarValue("FUEL TANK LEFT MAIN QUANTITY", "gallons", newLeftFuelQty);
                SimVar.SetSimVarValue("FUEL TANK RIGHT MAIN QUANTITY", "gallons", newRightFuelQty);

                this.previousLeftFuelQty = newLeftFuelQty;
                this.previousRightFuelQty = newRightFuelQty;
            } else {
                this.previousLeftFuelQty = leftFuelQty;
                this.previousRightFuelQty = rightFuelQty;
            }
        }
    }

    // Copy airway selections from temporary to active flightplan
    copyAirwaySelections() {
        const temporaryFPWaypoints = this.flightPlanManager.getWaypoints(1);
        const activeFPWaypoints = this.flightPlanManager.getWaypoints(0);
        for (let i = 0; i < activeFPWaypoints.length; i++) {
            if (activeFPWaypoints[i].infos && temporaryFPWaypoints[i] && activeFPWaypoints[i].icao === temporaryFPWaypoints[i].icao && temporaryFPWaypoints[i].infos) {
                activeFPWaypoints[i].infos.airwayIn = temporaryFPWaypoints[i].infos.airwayIn;
                activeFPWaypoints[i].infos.airwayOut = temporaryFPWaypoints[i].infos.airwayOut;
            }
        }
    }

    updatePersistentHeading() {
        if (this._frameUpdates % 500 == 499) {
            WTDataStore.set("AP_HEADING", SimVar.GetSimVarValue("AUTOPILOT HEADING LOCK DIR:1", "degree"));
        }
    }

    updateCabinLights() {
        if (this._frameUpdates % 100 == 0) {
            // TODO should go somewhere else later
            const batteryOn = SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "bool");
            if (!batteryOn) {
                CJ4_FMC_ModSettingsPage.setPassCabinLights(CJ4_FMC_ModSettingsPage.LIGHT_MODE.OFF);
            } else {
                CJ4_FMC_ModSettingsPage.setPassCabinLights(WTDataStore.get('passCabinLights', CJ4_FMC_ModSettingsPage.LIGHT_MODE.ON));
            }
        }
    }

    //METHOD TO RESET VSPEEDS ON NEW FPLN ENTRY/LOAD
    resetVspeeds() {
        SimVar.SetSimVarValue("L:WT_CJ4_VAP", "knots", 0);
        SimVar.SetSimVarValue("L:WT_CJ4_V1_SPEED", "knots", 0);
        SimVar.SetSimVarValue("L:WT_CJ4_VR_SPEED", "knots", 0);
        SimVar.SetSimVarValue("L:WT_CJ4_V2_SPEED", "knots", 0);
        SimVar.SetSimVarValue("L:WT_CJ4_VT_SPEED", "knots", 0);
        SimVar.SetSimVarValue("L:WT_CJ4_VREF_SPEED", "knots", 0);
    }

    //METHOD TO RESET FUEL USED ON FLIGHT START AND ON FPLN LOAD AND WITH BUTTON PRESS IN FUEL MGMT
    resetFuelUsed() {
        const fuelWeight = 6.7;
        const fuelQuantityLeft = Math.trunc(fuelWeight * SimVar.GetSimVarValue("FUEL LEFT QUANTITY", "Gallons"));
        const fuelQuantityRight = Math.trunc(fuelWeight * SimVar.GetSimVarValue("FUEL RIGHT QUANTITY", "Gallons"));
        this.initialFuelLeft = fuelQuantityLeft;
        this.initialFuelRight = fuelQuantityRight;
    }

    updateFlightLog() {
        if (this._frameUpdates % 30 == 0) {
            const takeOffTime = SimVar.GetSimVarValue("L:TAKEOFF_TIME", "seconds");
            const landingTime = SimVar.GetSimVarValue("L:LANDING_TIME", "seconds");
            const onGround = SimVar.GetSimVarValue("SIM ON GROUND", "Bool");
            const altitude = SimVar.GetSimVarValue("PLANE ALT ABOVE GROUND", "number");
            const zuluTime = SimVar.GetGlobalVarValue("ZULU TIME", "seconds");

            // Update takeoff time
            if (!takeOffTime) {
                if (!onGround && altitude > 15) {
                    if (zuluTime) {
                        SimVar.SetSimVarValue("L:TAKEOFF_TIME", "seconds", zuluTime);
                    }
                }
            } else if (takeOffTime && takeOffTime > 0 && landingTime && landingTime > 0) {
                if (!onGround && altitude > 15) {
                    if (zuluTime) {
                        SimVar.SetSimVarValue("L:TAKEOFF_TIME", "seconds", zuluTime);
                    }
                    SimVar.SetSimVarValue("L:LANDING_TIME", "seconds", 0); // Reset landing time
                    SimVar.SetSimVarValue("L:ENROUTE_TIME", "seconds", 0); // Reset enroute time
                }
            }

            if (takeOffTime && takeOffTime > 0) {
                // Update landing time
                if (onGround && (!landingTime || landingTime == 0)) {
                    if (zuluTime) {
                        SimVar.SetSimVarValue("L:LANDING_TIME", "seconds", zuluTime);
                    }
                }
                // Update enroute time
                if (!landingTime || landingTime == 0) {
                    const enrouteTime = zuluTime - takeOffTime;
                    SimVar.SetSimVarValue("L:ENROUTE_TIME", "seconds", enrouteTime);
                }
            }
        }
    }

    updateAlerters(dt) {
        const preselector = Simplane.getAutoPilotSelectedAltitudeLockValue();
        const indicated = Simplane.getAltitude();
        const difference = Math.abs(indicated - preselector);

        switch (this._altAlertState) {
            case CJ4_FMC.ALTALERT_STATE.NONE:
                SimVar.SetSimVarValue("L:WT_CJ4_Altitude_Alerter_Active", "Number", 0);
                if (difference < 1000) {
                    this._altAlertState = CJ4_FMC.ALTALERT_STATE.ARMED;
                }
                break;
            case CJ4_FMC.ALTALERT_STATE.ARMED:
                if (isFinite(dt)) {
                    this._altAlertCd -= dt;
                }

                if (this._altAlertCd < 0) {
                    this._altAlertState = CJ4_FMC.ALTALERT_STATE.ALERT;
                    this._altAlertCd = 500;
                } else if (difference > 1000) {
                    this._altAlertState = CJ4_FMC.ALTALERT_STATE.NONE;
                    this._altAlertCd = 500;
                }
                break;
            case CJ4_FMC.ALTALERT_STATE.ALERT:
                if (!Simplane.getIsGrounded() && SimVar.GetSimVarValue("L:WT_CJ4_Altitude_Alerter_Active", "Number") === 0 && SimVar.GetSimVarValue("L:WT_CJ4_Altitude_Alerter_Cancel", "Number") === 0) {
                    this._altAlertPreselect = preselector;
                    SimVar.SetSimVarValue("L:WT_CJ4_Altitude_Alerter_Active", "Number", 1);
                }

                // go to NONE when preselector changed or
                if (Math.abs(preselector - this._altAlertPreselect) > 1000) {
                    this._altAlertState = CJ4_FMC.ALTALERT_STATE.NONE;
                    SimVar.SetSimVarValue("L:WT_CJ4_Altitude_Alerter_Cancel", "Number", 0);

                }
                break;
        }
    }

    updateMsgs(dt) {
        this._msgUpdateCd -= dt;
        if (this._msgUpdateCd < 0) {
            // TODO where to put this message
            if (this.flightPlanManager.getActiveWaypointIdent() === "") {
                MessageService.getInstance().post(FMS_MESSAGE_ID.NO_FPLN, () => {
                    return this.flightPlanManager.getActiveWaypointIdent() !== "";
                });
            }

            MessageService.getInstance().update();
            this.setFmsMsg(this._fmcMsgReceiver.getMsgText());
            this._pfdMsgReceiver.update();
            this._msgUpdateCd = 500;
        }
    }
}

CJ4_FMC.ALTALERT_STATE = {
    NONE: 0,
    ARMED: 1,
    ALERT: 2
};

CJ4_FMC.VSPEED_STATUS = {
    NONE: 0,
    INPROGRESS: 1,
    SENT: 2,
};

registerInstrument("cj4-fmc", CJ4_FMC);
