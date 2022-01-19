window.app = function() {

  const SIM_CALCULATION_FREQUENCY = 4; // the frequency of sim loops
  const DEFAULT_SIM_SPEED_FACTOR = 1; // rate of simulation relative to real time
  const MAX_FUSELAGE_FUEL = 514;
  const MAX_WING_FUEL = 645;
  const MAX_SEAT_FUEL = 195;
  const MAX_PYLON_FUEL = 632;
  const MAX_TIP_FUEL = 585;
  const TANK_SELECTOR_WINGS = Symbol('wings');
  const TANK_SELECTOR_SEAT = Symbol('seat');
  const TANK_SELECTOR_PYLONS = Symbol('pylons');
  const TIP_SELECTOR_OFF = Symbol('off');
  const TIP_SELECTOR_ON = Symbol('on');
  const TIP_SELECTOR_DUMP = Symbol('dump');

  /* Runtime */

  const state = {
    simSpeedFactor: DEFAULT_SIM_SPEED_FACTOR,
    powerSetting: 0,
    batteryMasterOn: false,
    fuelFuselage: MAX_FUSELAGE_FUEL,
    fuelWingLeft: MAX_WING_FUEL,
    fuelWingRight: MAX_WING_FUEL,
    fuelSeat: 0, // don't think the seat tank was common, so leaving it empty seems a good default
    fuelPylonLeftOuter: 0,
    fuelPylonLeftInner: MAX_PYLON_FUEL,
    fuelPylonRightInner: MAX_PYLON_FUEL,
    fuelPylonRightOuter: 0,
    fuelTipLeft: MAX_TIP_FUEL,
    fuelTipRight: MAX_TIP_FUEL,
    proportionerPumpsOn: false,
    fuelTankSelector: TANK_SELECTOR_WINGS,
    tipTankSelectorLeft: TIP_SELECTOR_OFF,
    tipTankSelectorRight: TIP_SELECTOR_OFF,
    tipTankDumpOnLeft: false,
    tipTankDumpOnRight: false,
    fuelTestButtonDepressed: false,
  };

  const throttlePosition = () =>
    document.getElementById('throttle').valueAsNumber;

  const engineCanRun = () => state.batteryMasterOn && state.fuelFuselage > 0;

  const engineIsRunning = () => state.powerSetting > 0;

  const seatTransferPumpIsOn = () => engineIsRunning() && state.fuelTankSelector == TANK_SELECTOR_SEAT;

  const leftTipTransferPumpIsOn = () => engineIsRunning() && state.tipTankSelectorLeft == TIP_SELECTOR_ON;
  const rightTipTransferPumpIsOn = () => engineIsRunning() && state.tipTankSelectorRight == TIP_SELECTOR_ON;

  const MAX_SINGLE_ENGINE_FUEL_FLOW = 3200; // lbs / hr
  const TRANSFER_PUMPS_FUEL_FLOW = 8000; // lbs / hr
  const TIP_DUMP_FUEL_FLOW = 15000;

  const updateFuelLevels = () => {
    // tip tank dumping
    const nominalAmountDumped = (TIP_DUMP_FUEL_FLOW * state.simSpeedFactor) / (3600 * SIM_CALCULATION_FREQUENCY);
    if (engineIsRunning() && state.tipTankDumpOnLeft)
      state.fuelTipLeft = Math.max(state.fuelTipLeft - nominalAmountDumped, 0);
    if (engineIsRunning() && state.tipTankDumpOnRight)
      state.fuelTipRight = Math.max(state.fuelTipRight - nominalAmountDumped, 0);

    // fuselage tank
    const totalEngineFuelFlow = 2 * MAX_SINGLE_ENGINE_FUEL_FLOW * state.powerSetting / 100;
    const fuselageFuelConsumedLastPeriod = (totalEngineFuelFlow * state.simSpeedFactor) / (3600 * SIM_CALCULATION_FREQUENCY);
    const transferFlowPerPeriod = (TRANSFER_PUMPS_FUEL_FLOW * state.simSpeedFactor) / (3600 * SIM_CALCULATION_FREQUENCY);

    const fuelAvailableInFuselageSource =
      state.fuelTankSelector == TANK_SELECTOR_WINGS ?
        (state.fuelWingLeft + state.fuelWingRight) :
          state.fuelTankSelector == TANK_SELECTOR_SEAT ?
          state.fuelSeat :
          (state.fuelPylonLeftOuter + state.fuelPylonLeftInner + state.fuelPylonRightInner + state.fuelPylonRightOuter);
    const nominalFuelTransferredToFuselage = (state.proportionerPumpsOn || seatTransferPumpIsOn()) ?
          transferFlowPerPeriod :
          0;
    let fuelTransferredToFuselage = Math.min(fuelAvailableInFuselageSource, nominalFuelTransferredToFuselage);
    const netFuselageFlow = fuelTransferredToFuselage - fuselageFuelConsumedLastPeriod;
    state.fuelFuselage = Math.max(state.fuelFuselage + netFuselageFlow, 0);
    if (state.fuelFuselage > MAX_FUSELAGE_FUEL) {
      const overflow = state.fuelFuselage - MAX_FUSELAGE_FUEL;
      state.fuelFuselage = MAX_FUSELAGE_FUEL;
      fuelTransferredToFuselage = fuelTransferredToFuselage - overflow;
    }

    // wing tanks
    let leftWingInflow = leftTipTransferPumpIsOn() ?
            Math.min(state.fuelTipLeft, transferFlowPerPeriod) :
            0;
    let leftWingOutflow = 0;

    let rightWingInflow = rightTipTransferPumpIsOn() ?
            Math.min(state.fuelTipRight, transferFlowPerPeriod) :
            0;
    let rightWingOutflow = 0;

    if (state.proportionerPumpsOn && state.fuelTankSelector == TANK_SELECTOR_WINGS) {
      // the proportioner pumps draw equally from each side, but presumably will draw the whole amount from one side if the other is empty...
      // or runs empty during the calculation period. So the calc cannot just split flow 50/50
      const leftWingNominalOutflow = Math.min(state.fuelWingLeft, fuelTransferredToFuselage / 2);
      const rightWingNominalOutflow = Math.min(state.fuelWingRight, fuelTransferredToFuselage / 2);
      leftWingOutflow = fuelTransferredToFuselage - rightWingNominalOutflow;
      rightWingOutflow = fuelTransferredToFuselage - leftWingNominalOutflow;
    }

    const leftWingNetFlow = leftWingInflow - leftWingOutflow;
    state.fuelWingLeft = Math.max(state.fuelWingLeft + leftWingNetFlow, 0)
    if (state.fuelWingLeft > MAX_WING_FUEL) {
      const overflow = state.fuelWingLeft - MAX_WING_FUEL;
      state.fuelWingLeft = MAX_WING_FUEL;
      leftWingInflow = leftWingInflow - overflow;
    }

    const rightWingNetFlow = rightWingInflow - rightWingOutflow;
    state.fuelWingRight = Math.max(state.fuelWingRight + rightWingNetFlow, 0)
    if (state.fuelWingRight > MAX_WING_FUEL) {
      const overflow = state.fuelWingRight - MAX_WING_FUEL;
      state.fuelWingRight = MAX_WING_FUEL;
      rightWingInflow = rightWingInflow - overflow;
    }

    // tip tanks
    if (leftTipTransferPumpIsOn()) {
      state.fuelTipLeft = state.fuelTipLeft - leftWingInflow;
    }
    if (rightTipTransferPumpIsOn()) {
      state.fuelTipRight = state.fuelTipRight - rightWingInflow;
    }

    // seat tank
    if (seatTransferPumpIsOn()) {
      state.fuelSeat = Math.max(state.fuelSeat - fuelTransferredToFuselage, 0)
    }

    // pylon tanks
    if (state.proportionerPumpsOn && state.fuelTankSelector == TANK_SELECTOR_PYLONS) {
      // like the wing tank calcs this must take account of uneven fuel levels left to right
      // but also between pylons on each side
      const leftPylonsFuelAvailable = state.fuelPylonLeftOuter + state.fuelPylonLeftInner;
      const leftPylonsNominalOutflow = Math.min(leftPylonsFuelAvailable, fuelTransferredToFuselage / 2);

      const rightPylonsFuelAvailable = state.fuelPylonRightInner + state.fuelPylonRightOuter;
      const rightPylonsNominalOutflow = Math.min(rightPylonsFuelAvailable, fuelTransferredToFuselage / 2);

      const leftPylonsOutflow = fuelTransferredToFuselage - rightPylonsNominalOutflow;
      const rightPylonsOutflow = fuelTransferredToFuselage - leftPylonsNominalOutflow;

      // left pylons
      const leftOuterNominalOutflow = Math.min(state.fuelPylonLeftOuter, leftPylonsOutflow / 2);
      const leftInnerNominalOutflow = Math.min(state.fuelPylonLeftInner, leftPylonsOutflow / 2);
      const leftOuterOutflow = leftPylonsOutflow - leftInnerNominalOutflow;
      state.fuelPylonLeftOuter = Math.max(state.fuelPylonLeftOuter - leftOuterOutflow, 0);
      const leftInnerOutflow = leftPylonsOutflow - leftOuterNominalOutflow;
      state.fuelPylonLeftInner = Math.max(state.fuelPylonLeftInner - leftInnerOutflow, 0);

      // right pylons
      const rightInnerNominalOutflow = Math.min(state.fuelPylonRightInner, rightPylonsOutflow / 2);
      const rightOuterNominalOutflow = Math.min(state.fuelPylonRightOuter, rightPylonsOutflow / 2);
      const rightInnerOutflow = rightPylonsOutflow - rightOuterNominalOutflow;
      state.fuelPylonRightInner = Math.max(state.fuelPylonRightInner - rightInnerOutflow, 0);
      const rightOuterOutflow = rightPylonsOutflow - rightInnerNominalOutflow;
      state.fuelPylonRightOuter = Math.max(state.fuelPylonRightOuter - rightOuterOutflow, 0);
    }
  };

  const TRANSFER_PUMPS_FUEL_ON = 450;
  const TRANSFER_PUMPS_FUEL_OFF = 500; // manual specifieds 520 +/- 20, but max fuel is 514

  const updateSimulation = () => {
    // Calculation of fuel flows/levels is retrospective - the fuel used in the
    // last simulation period will be calculated and deducted in this period to
    // bring up to date. This done first, before any decisions or indications
    // are made based on fuel state.
    updateFuelLevels();

    state.powerSetting = engineCanRun() ? throttlePosition() : 0;
    state.proportionerPumpsOn = engineIsRunning() &&
      (state.fuelTankSelector != TANK_SELECTOR_SEAT) &&
      (state.fuelFuselage < TRANSFER_PUMPS_FUEL_ON ||
       (state.fuelFuselage < TRANSFER_PUMPS_FUEL_OFF && state.proportionerPumpsOn));

    if (engineIsRunning() && state.tipTankSelectorLeft == TIP_SELECTOR_DUMP)
      state.tipTankDumpOnLeft = true;

    if (engineIsRunning() && state.tipTankDumpOnLeft && state.tipTankSelectorLeft == TIP_SELECTOR_ON)
      state.tipTankDumpOnLeft = false;

    if (engineIsRunning() && state.tipTankSelectorRight == TIP_SELECTOR_DUMP)
      state.tipTankDumpOnRight = true;

    if (engineIsRunning() && state.tipTankDumpOnRight && state.tipTankSelectorRight == TIP_SELECTOR_ON)
      state.tipTankDumpOnRight = false;
  };

  const FUEL_LINE_COLOUR = '#36d4dc';
  const FUEL_VENT_COLOUR = '#36dc91';
  const renderFuelLine = (cssSelector, hasFuelFlow) => {
    document.querySelector(cssSelector).style.setProperty('fill', hasFuelFlow ? FUEL_LINE_COLOUR : 'white');
  };
  const renderVentLine = (cssSelector, isOverflowing) => {
    document.querySelector(cssSelector).style.setProperty('fill', isOverflowing ? FUEL_VENT_COLOUR : 'white');
  };

  const renderPump = (pumpName, isOn, hasPressure) => {
    document.querySelectorAll(`g[name="${pumpName}"] g[name="impeller"]`).forEach(impeller => {
      impeller.style.setProperty('transform-box', 'fill-box');
      impeller.style.setProperty('transform-origin', 'center');
      impeller.
        querySelector('animateTransform').
        setAttribute('to', isOn ? '60' : '0');
    });

    renderFuelLine(`g[name="${pumpName}"] [name="background"]`, hasPressure);
  };

  const renderEngines = () => {
    // To show or not the heat gradient in the engine
    document.querySelectorAll('linearGradient[name="engine"] stop').forEach(stop =>
      stop.style.setProperty('stop-opacity', engineIsRunning() ? '1' : '0')
    );

    // The level of heat in the engine
    // Hue runs from 1 (cold end) to 56
    const hue = Math.round(1 + (55 * state.powerSetting / 100));
    // Lightness runs from 42 (cold end) to 50
    const lightness = Math.round(42 + (8 * state.powerSetting / 100));
    const color = `hsl(${hue}, 90%, ${lightness}%)`;
    document.
      querySelector('linearGradient[name="engine"] stop[name="hot"]').
      style.setProperty('stop-color', color);

    // Rotating compressor
    document.
      querySelector('pattern[name="compressor"] animate').
      setAttribute('to', engineIsRunning() ? '4' : '0');

    // Fuel pumps
    renderPump('pumpEngineLeft', engineIsRunning(), engineIsRunning());
    renderPump('pumpEngineRight', engineIsRunning(), engineIsRunning());

    // Fuel lines
    renderFuelLine('path[name="fuelLineFuselageToEngine"]', engineIsRunning());

    // Fuel flow gauge
    const singleEngineFuelFlow = MAX_SINGLE_ENGINE_FUEL_FLOW * state.powerSetting / 100;
    const INDICATOR_ANGULAR_RATE = 65; // degrees of angle of the indicator per 1000 lbs/hr fuel flow
    document.
      querySelectorAll('g[name="gaugeFuelFlow"] path[name="indicator"]').
      forEach(indicator => {
        indicator.style.setProperty('transform-box', 'fill-box');
        indicator.style.setProperty('transform-origin', 'center');
        indicator.style.setProperty('transform', `rotate(${ INDICATOR_ANGULAR_RATE * singleEngineFuelFlow / 1000 }deg)`);
      });
  };

  const renderBatteryMasterSwitch = () => {
    document.querySelector('g[name="switchBatteryOn"]').style.setProperty('display', state.batteryMasterOn ? 'inline' : 'none');
    document.querySelector('g[name="switchBatteryOff"]').style.setProperty('display', state.batteryMasterOn ? 'none' : 'inline' );
  };

  const renderFuelTankIndicator = (tankName, currentFuel, maxFuel) => {
    const indicator = document.querySelector(`g[name="${tankName}"]`);
    indicator.querySelector('text').textContent = `${new String(Math.floor(currentFuel)).padStart(3, "0")} lbs`;

    const barStyle = indicator.querySelector('rect[name="barGauge"]').style;
    barStyle.setProperty('transform', `scaleY(${ currentFuel / maxFuel })`);
    barStyle.setProperty('transform-box', 'fill-box');
    barStyle.setProperty('transform-origin', 'bottom');
  };

  const renderFuselageTank = () => {
    renderPump('pumpFuselage', state.batteryMasterOn, state.batteryMasterOn && state.fuelFuselage > 0);
    renderFuelTankIndicator('indicatorFuelFuselage', state.fuelFuselage, MAX_FUSELAGE_FUEL);
  };

  const renderSimulationControls = () => {
    document.querySelector('text[name="simSpeed"]').textContent = `x ${state.simSpeedFactor}`;
  };

  const renderAnnunciatorLamp = (lampName, isOn) => {
    document.querySelector(`g[name="annunciatorPanel"] g[name="${lampName}"] rect[name="mask"]`).style.setProperty('fill-opacity', state.batteryMasterOn && isOn ? '0' : '0.75');
  };

  const renderAnnunciatorPanel = () => {
    renderAnnunciatorLamp('boostOff', state.fuelFuselage < 1);
    renderAnnunciatorLamp('fuelLow', state.fuelFuselage < 295);
    renderAnnunciatorLamp('seatTankEmpty', seatTransferPumpIsOn() && state.fuelFuselage < 375);
    renderAnnunciatorLamp('pylonTanksEmpty', state.proportionerPumpsOn && (state.fuelTankSelector == TANK_SELECTOR_PYLONS) && state.fuelFuselage < 375);
    renderAnnunciatorLamp('tipTankEmptyLeft', leftTipTransferPumpIsOn() && state.fuelTipLeft <= 0);
    renderAnnunciatorLamp('tipTankEmptyRight', rightTipTransferPumpIsOn() && state.fuelTipRight <= 0);
  };

  const SWITCH_3_POS_UP = Symbol('up');
  const SWITCH_3_POS_MIDDLE = Symbol('middle');
  const SWITCH_3_POS_DOWN = Symbol('down');
  const render3PositionSwitch = (cssSelector, position) => {
    const switchGroup = document.querySelector(cssSelector);
    switchGroup.querySelector('g[name="switchUp"]').style.setProperty('display', position == SWITCH_3_POS_UP ? 'inline' : 'none');
    switchGroup.querySelector('g[name="switchMiddle"]').style.setProperty('display', position == SWITCH_3_POS_MIDDLE ? 'inline' : 'none');
    switchGroup.querySelector('g[name="switchDown"]').style.setProperty('display', position == SWITCH_3_POS_DOWN ? 'inline' : 'none');
  };

  const renderFuelGauge = (indicatorElement, indicatorRotation) => {
    let indicatorStyle = indicatorElement.style;
    indicatorStyle.setProperty('transform-box', 'fill-box');
    indicatorStyle.setProperty('transform-origin', 'center');

    let indicatorTransform = indicatorElement.querySelector('animateTransform');
    if (!state.fuelTestButtonDepressed) {
      indicatorTransform.setAttribute('from', indicatorTransform.getAttribute('to'));
      indicatorTransform.setAttribute('to', new String(indicatorRotation));
      indicatorTransform.beginElement();
    }
  };

  const renderFuelPanel = () => {
    // fuselage/internal gauge
    const GAUGE1_ANGULAR_RATE = 147; // degrees per 1000 lbs of fuel

    renderFuelGauge(
      document.querySelector('g[name="fuelPanel"] g[name="gaugeFuel1"] path[name="indicatorFuselage"]'),
      state.fuelFuselage * GAUGE1_ANGULAR_RATE / 1000)
    ;

    const totalFuel = state.fuelFuselage + state.fuelWingLeft + state.fuelWingRight;
    renderFuelGauge(
      document.querySelector('g[name="fuelPanel"] g[name="gaugeFuel1"] path[name="indicatorInternal"]'),
      totalFuel * GAUGE1_ANGULAR_RATE / 1000)
    ;

    // wings gauge
    const GAUGE2_ANGULAR_RATE = 38.75; // degrees per 100 lbs of fuel

    renderFuelGauge(
      document.querySelector('g[name="fuelPanel"] g[name="gaugeFuel2"] path[name="indicatorWingLeft"]'),
      state.fuelWingLeft * GAUGE2_ANGULAR_RATE / 100)
    ;

    renderFuelGauge(
      document.querySelector('g[name="fuelPanel"] g[name="gaugeFuel2"] path[name="indicatorWingRight"]'),
      state.fuelWingRight * GAUGE2_ANGULAR_RATE / 100)
    ;

    render3PositionSwitch(
      'g[name="fuelPanel"] g[name="switchFuelSelector"]',
      state.fuelTankSelector == TANK_SELECTOR_SEAT ? SWITCH_3_POS_UP :
        state.fuelTankSelector == TANK_SELECTOR_WINGS ? SWITCH_3_POS_MIDDLE :
        SWITCH_3_POS_DOWN
    );

    render3PositionSwitch(
      'g[name="fuelPanel"] g[name="switchTipTankLeft"]',
      state.tipTankSelectorLeft == TIP_SELECTOR_ON ? SWITCH_3_POS_UP :
        state.tipTankSelectorLeft == TIP_SELECTOR_OFF ? SWITCH_3_POS_MIDDLE :
        SWITCH_3_POS_DOWN
    );

    render3PositionSwitch(
      'g[name="fuelPanel"] g[name="switchTipTankRight"]',
      state.tipTankSelectorRight == TIP_SELECTOR_ON ? SWITCH_3_POS_UP :
        state.tipTankSelectorRight == TIP_SELECTOR_OFF ? SWITCH_3_POS_MIDDLE :
        SWITCH_3_POS_DOWN
    );

    const fuelTestGaugeStyle = document.querySelector('g[name="buttonFuelTest"]').style;
    fuelTestGaugeStyle.setProperty('transform-box', 'fill-box');
    fuelTestGaugeStyle.setProperty('transform-origin', 'center');
    fuelTestGaugeStyle.setProperty('transform', `scale(${ state.fuelTestButtonDepressed ? '0.7' : '1.0' })`);
  };

  const renderProportionerLines = () => {
    const hasLeftWingFuel = state.fuelWingLeft > 0;
    const hasRightWingFuel = state.fuelWingRight > 0;
    const hasWingFuel = hasLeftWingFuel || hasRightWingFuel;
    const hasLeftPylonFuel = state.fuelPylonLeftOuter > 0 || state.fuelPylonLeftInner > 0;
    const hasRightPylonFuel = state.fuelPylonRightInner > 0 || state.fuelPylonRightOuter > 0;
    const hasPylonFuel = hasLeftPylonFuel || hasRightPylonFuel;
    const hasFuel = state.fuelTankSelector == TANK_SELECTOR_WINGS ?
      hasWingFuel :
          state.fuelTankSelector == TANK_SELECTOR_PYLONS ?
          hasPylonFuel :
          false;
    renderPump('pumpProportioners', state.proportionerPumpsOn, state.proportionerPumpsOn && hasFuel);

    renderFuelLine('path[name="fuelLineWingToFuselageLeft"]', (state.fuelTankSelector == TANK_SELECTOR_WINGS) && state.proportionerPumpsOn && hasLeftWingFuel);
    renderFuelLine('path[name="fuelLineWingToFuselageRight"]', (state.fuelTankSelector == TANK_SELECTOR_WINGS) && state.proportionerPumpsOn && hasRightWingFuel);
    renderFuelLine('path[name="fuelLinePylonToFuselageLeft"]', (state.fuelTankSelector == TANK_SELECTOR_PYLONS) && state.proportionerPumpsOn && hasLeftPylonFuel);
    renderFuelLine('path[name="fuelLinePylonToFuselageRight"]', (state.fuelTankSelector == TANK_SELECTOR_PYLONS) && state.proportionerPumpsOn && hasRightPylonFuel);
    renderFuelLine('rect[name="fuelLinePylonToPylonLeft"]', (state.fuelTankSelector == TANK_SELECTOR_PYLONS) && state.proportionerPumpsOn && (state.fuelPylonLeftOuter > 0));
    renderFuelLine('rect[name="fuelLinePylonToPylonRight"]', (state.fuelTankSelector == TANK_SELECTOR_PYLONS) && state.proportionerPumpsOn && (state.fuelPylonRightOuter > 0));
  };

  const renderWingTanks = () => {
    renderFuelTankIndicator('indicatorFuelWingLeft', state.fuelWingLeft, MAX_WING_FUEL);
    renderFuelTankIndicator('indicatorFuelWingRight', state.fuelWingRight, MAX_WING_FUEL);
  };

  const renderSeatTank = () => {
    renderFuelTankIndicator('indicatorFuelSeat', state.fuelSeat, MAX_SEAT_FUEL);
    const pumpHasPressure = seatTransferPumpIsOn() && state.fuelSeat > 0;
    renderPump('pumpSeat', seatTransferPumpIsOn(), pumpHasPressure);
    renderFuelLine('rect[name="fuelLineSeatToFuselage"]', pumpHasPressure);
    const lineIsOverflowing = pumpHasPressure && (state.fuelFuselage >= MAX_FUSELAGE_FUEL);
    renderVentLine('rect[name="fuelLineSeatToFuselageVent"]', lineIsOverflowing);
  };

  const renderPylonTanks = () => {
    renderFuelTankIndicator('indicatorFuelPylonLeftOuter', state.fuelPylonLeftOuter, MAX_PYLON_FUEL);
    renderFuelTankIndicator('indicatorFuelPylonLeftInner', state.fuelPylonLeftInner, MAX_PYLON_FUEL);
    renderFuelTankIndicator('indicatorFuelPylonRightInner', state.fuelPylonRightInner, MAX_PYLON_FUEL);
    renderFuelTankIndicator('indicatorFuelPylonRightOuter', state.fuelPylonRightOuter, MAX_PYLON_FUEL);
  };

  const renderTipTanks = () => {
    // left
    renderFuelTankIndicator('indicatorFuelTipLeft', state.fuelTipLeft, MAX_TIP_FUEL);
    const leftPumpHasPressure = leftTipTransferPumpIsOn() && (state.fuelTipLeft > 0);
    renderPump('pumpTipLeft', leftTipTransferPumpIsOn(), leftPumpHasPressure);
    renderFuelLine('rect[name="fuelLineTipToWingLeft"]', leftPumpHasPressure);
    renderVentLine('rect[name="fuelLineTipToWingVentLeft"]', leftPumpHasPressure && (state.fuelWingLeft >= MAX_WING_FUEL));

    const leftDumpValve = document.querySelector('g[name="tipTankDumpValveLeft"]');
    const leftValveStyle = leftDumpValve.querySelector('rect[name="valve"]').style;
    leftValveStyle.setProperty('transform-box', 'fill-box');
    leftValveStyle.setProperty('transform-origin', 'center');
    leftValveStyle.setProperty('transform', `rotate(${ state.tipTankDumpOnLeft ? 90 : 0 }deg)`);
    leftDumpValve.querySelector('path[name="background"]').style.setProperty('fill', engineIsRunning() && state.tipTankDumpOnLeft && (state.fuelTipLeft > 0) ? FUEL_LINE_COLOUR : 'white');

    // right
    renderFuelTankIndicator('indicatorFuelTipRight', state.fuelTipRight, MAX_TIP_FUEL);
    const rightPumpHasPressure = rightTipTransferPumpIsOn() && (state.fuelTipRight > 0);
    renderPump('pumpTipRight', rightTipTransferPumpIsOn(), rightPumpHasPressure);
    renderFuelLine('rect[name="fuelLineTipToWingRight"]', rightPumpHasPressure);
    renderVentLine('rect[name="fuelLineTipToWingVentRight"]', rightPumpHasPressure && (state.fuelWingRight >= MAX_WING_FUEL));

    const rightDumpValve = document.querySelector('g[name="tipTankDumpValveRight"]');
    const rightValveStyle = rightDumpValve.querySelector('rect[name="valve"]').style;
    rightValveStyle.setProperty('transform-box', 'fill-box');
    rightValveStyle.setProperty('transform-origin', 'center');
    rightValveStyle.setProperty('transform', `rotate(${ state.tipTankDumpOnRight ? 90 : 0 }deg)`);
    rightDumpValve.querySelector('path[name="background"]').style.setProperty('fill', engineIsRunning() && state.tipTankDumpOnRight && (state.fuelTipRight > 0) ? FUEL_LINE_COLOUR : 'white');
  };

  const renderUI = () => {
    renderBatteryMasterSwitch();
    renderEngines();
    renderFuselageTank();
    renderSimulationControls();
    renderAnnunciatorPanel();
    renderFuelPanel();
    renderProportionerLines();
    renderWingTanks();
    renderSeatTank();
    renderPylonTanks();
    renderTipTanks();
  };

  const runSimulation = () => {
    updateSimulation();
    renderUI();
  };

  /* end runtime */

  /* Event handlers */

  const throttleChangedHandler = () => {
  };

  const prepareFuelIndicatorChange = (tankName, getFuel) => () => {
    const indicatorGroup = document.querySelector(`g[name="${tankName}"]`);
    const input =  indicatorGroup.querySelector('input[type="text"]');
    input.value = Math.floor(getFuel());
    input.style.setProperty('display', 'inline');
    input.select();

    indicatorGroup.querySelector('text').style.setProperty('display', 'none');
  };

  const handleFuelIndicatorChange = (tankName, setFuel, maxFuel) => () => {
    const indicatorGroup = document.querySelector(`g[name="${tankName}"]`);
    const textInput = indicatorGroup.querySelector('input[type="text"]');
    const newLevel = Number.parseInt(textInput.value);
    if (!!newLevel || newLevel == 0) {
      setFuel(Math.min(Math.max(newLevel, 0), maxFuel));
    }

    textInput.style.setProperty('display', 'none');
    indicatorGroup.
      querySelector('text').
      style.setProperty('display', 'inline');
  };

  /* end event handlers */

  /* Initialisation */

  const addFuelIndicatorEventHandlers = (tankName, getFuel, setFuel, maxFuel) => {
    document.querySelector(`g[name="${tankName}"] text`).onclick = prepareFuelIndicatorChange(tankName, getFuel);
    document.querySelector(`g[name="${tankName}"] input[type="text"]`).onblur = handleFuelIndicatorChange(tankName, setFuel, maxFuel);
  };

  const add3PositionSwitchEventHandlers = (cssSelector, positionCallback) => {
    const switchGroup = document.querySelector(cssSelector);
    switchGroup.querySelector('g[name="switchUp"]').onclick = () => positionCallback(SWITCH_3_POS_MIDDLE);
    switchGroup.querySelector('g[name="switchMiddle"] rect[name="switchToggleUp"]').onclick = () => positionCallback(SWITCH_3_POS_UP);
    switchGroup.querySelector('g[name="switchMiddle"] rect[name="switchToggleDown"]').onclick = () => positionCallback(SWITCH_3_POS_DOWN);
    switchGroup.querySelector('g[name="switchDown"]').onclick = () => positionCallback(SWITCH_3_POS_MIDDLE);
  };

  const fuelGaugeBeginTest = (gauge) => {
    const animation = gauge.querySelector('animateTransform');
    animation.setAttribute('from', animation.getAttribute('to'));
    animation.setAttribute('to', '0');
    animation.setAttribute('dur', '1s');
    animation.beginElement();
  };

  const fuelGaugeEndTest = (gauge) => {
    const animation = gauge.querySelector('animateTransform');
    animation.setAttribute('from', '0');
    animation.setAttribute('dur', '0.25s');
  };

  const addEventHandlers = () => {
    document.getElementById('throttle').oninput = throttleChangedHandler;
    document.querySelector('g[name="switchBatteryOn"]').onclick = () => { state.batteryMasterOn = false; };
    document.querySelector('g[name="switchBatteryOff"]').onclick = () => { state.batteryMasterOn = true; };
    addFuelIndicatorEventHandlers('indicatorFuelFuselage', () => state.fuelFuselage, (fuel) => { state.fuelFuselage = fuel; }, MAX_FUSELAGE_FUEL);
    document.querySelector('g[name="buttonSimSpeedNormal"]').onclick = () => { state.simSpeedFactor = 1; };
    document.querySelector('g[name="buttonSimSpeedFaster"]').onclick = () => { state.simSpeedFactor = Math.min(state.simSpeedFactor * 2, 32); };
    document.querySelector('g[name="buttonSimSpeedSlower"]').onclick = () => { state.simSpeedFactor = Math.max(state.simSpeedFactor / 2, 1); };
    addFuelIndicatorEventHandlers('indicatorFuelWingLeft', () => state.fuelWingLeft, (fuel) => { state.fuelWingLeft = fuel; }, MAX_WING_FUEL);
    addFuelIndicatorEventHandlers('indicatorFuelWingRight', () => state.fuelWingRight, (fuel) => { state.fuelWingRight = fuel; }, MAX_WING_FUEL);
    add3PositionSwitchEventHandlers('g[name="fuelPanel"] g[name="switchFuelSelector"]', (newPos) => {
      switch (newPos) {
      case SWITCH_3_POS_UP: state.fuelTankSelector = TANK_SELECTOR_SEAT; break;
      case SWITCH_3_POS_MIDDLE: state.fuelTankSelector = TANK_SELECTOR_WINGS; break;
      case SWITCH_3_POS_DOWN: state.fuelTankSelector = TANK_SELECTOR_PYLONS; break;
      };
    });
    addFuelIndicatorEventHandlers('indicatorFuelSeat', () => state.fuelSeat, (fuel) => { state.fuelSeat = fuel; }, MAX_SEAT_FUEL);
    addFuelIndicatorEventHandlers('indicatorFuelPylonLeftOuter', () => state.fuelPylonLeftOuter, (fuel) => { state.fuelPylonLeftOuter = fuel; }, MAX_PYLON_FUEL);
    addFuelIndicatorEventHandlers('indicatorFuelPylonLeftInner', () => state.fuelPylonLeftInner, (fuel) => { state.fuelPylonLeftInner = fuel; }, MAX_PYLON_FUEL);
    addFuelIndicatorEventHandlers('indicatorFuelPylonRightInner', () => state.fuelPylonRightInner, (fuel) => { state.fuelPylonRightInner = fuel; }, MAX_PYLON_FUEL);
    addFuelIndicatorEventHandlers('indicatorFuelPylonRightOuter', () => state.fuelPylonRightOuter, (fuel) => { state.fuelPylonRightOuter = fuel; }, MAX_PYLON_FUEL);
    addFuelIndicatorEventHandlers('indicatorFuelTipLeft', () => state.fuelTipLeft, (fuel) => { state.fuelTipLeft = fuel; }, MAX_TIP_FUEL);
    addFuelIndicatorEventHandlers('indicatorFuelTipRight', () => state.fuelTipRight, (fuel) => { state.fuelTipRight = fuel; }, MAX_TIP_FUEL);
    add3PositionSwitchEventHandlers('g[name="fuelPanel"] g[name="switchTipTankLeft"]', (newPos) => {
      switch (newPos) {
      case SWITCH_3_POS_UP: state.tipTankSelectorLeft = TIP_SELECTOR_ON; break;
      case SWITCH_3_POS_MIDDLE: state.tipTankSelectorLeft = TIP_SELECTOR_OFF; break;
      case SWITCH_3_POS_DOWN: state.tipTankSelectorLeft = TIP_SELECTOR_DUMP; break;
      };
    });
    add3PositionSwitchEventHandlers('g[name="fuelPanel"] g[name="switchTipTankRight"]', (newPos) => {
      switch (newPos) {
      case SWITCH_3_POS_UP: state.tipTankSelectorRight = TIP_SELECTOR_ON; break;
      case SWITCH_3_POS_MIDDLE: state.tipTankSelectorRight = TIP_SELECTOR_OFF; break;
      case SWITCH_3_POS_DOWN: state.tipTankSelectorRight = TIP_SELECTOR_DUMP; break;
      };
    });

    // fuel test button
    document.querySelector('g[name="fuelPanel"] g[name="buttonFuelTest"]').onclick = () => {
      state.fuelTestButtonDepressed = true;
      fuelGaugeBeginTest(document.querySelector('g[name="fuelPanel"] path[name="indicatorFuselage"]'));
      fuelGaugeBeginTest(document.querySelector('g[name="fuelPanel"] path[name="indicatorInternal"]'));
      fuelGaugeBeginTest(document.querySelector('g[name="fuelPanel"] path[name="indicatorWingLeft"]'));
      fuelGaugeBeginTest(document.querySelector('g[name="fuelPanel"] path[name="indicatorWingRight"]'));
      window.setTimeout(() => {
        state.fuelTestButtonDepressed = false;
        fuelGaugeEndTest(document.querySelector('g[name="fuelPanel"] path[name="indicatorFuselage"]'));
        fuelGaugeEndTest(document.querySelector('g[name="fuelPanel"] path[name="indicatorInternal"]'));
        fuelGaugeEndTest(document.querySelector('g[name="fuelPanel"] path[name="indicatorWingLeft"]'));
        fuelGaugeEndTest(document.querySelector('g[name="fuelPanel"] path[name="indicatorWingRight"]'));
      }, 3000);
    };
  };

  const initSimulation = () => {
  };

  const initUI = () => {
  };

  const init = () => {
    console.log('initing');
    addEventHandlers();
    initSimulation();
    initUI();
    window.setInterval(runSimulation, 1000 / SIM_CALCULATION_FREQUENCY);
  };

  /* end initialisation */

  return {
    init
  };

}();

window.onload = function() {
  app.init();
};
