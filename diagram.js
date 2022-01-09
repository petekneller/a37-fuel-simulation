window.app = function() {

  const SIM_CALCULATION_FREQUENCY = 4; // the frequency of sim loops
  const DEFAULT_SIM_SPEED_FACTOR = 1; // rate of simulation relative to real time
  const MAX_SINGLE_ENGINE_FUEL_FLOW = 3200; // lbs / hr
  const FUEL_LINE_COLOUR = '#36d4dc';
  const MAX_FUSELAGE_FUEL = 514;
  const MAX_WING_FUEL = 645;
  const MAX_SEAT_FUEL = 195;
  const TANK_SELECTOR_WINGS = Symbol('wings');
  const TANK_SELECTOR_SEAT = Symbol('seat');
  const TANK_SELECTOR_PYLONS = Symbol('pylons');
  const PROPORTIONER_PUMPS_FUEL_FLOW = 8000; // lbs / hr

  /* Runtime */

  const state = {
    simSpeedFactor: DEFAULT_SIM_SPEED_FACTOR,
    powerSetting: 0,
    batteryMasterOn: false,
    fuelFuselage: MAX_FUSELAGE_FUEL,
    fuelWingLeft: MAX_WING_FUEL,
    fuelWingRight: MAX_WING_FUEL,
    fuelSeat: 0, // don't think the seat tank was common, so leaving it empty seems a good default
    proportionerPumpsOn: false,
    fuelTankSelector: TANK_SELECTOR_WINGS,
  };

  const throttlePosition = () =>
    document.getElementById('throttle').valueAsNumber;

  const engineCanRun = () => state.batteryMasterOn && state.fuelFuselage > 0;

  const engineIsRunning = () => state.powerSetting > 0;

  const updateFuelLevels = () => {
    // fuselage tank
    const totalEngineFuelFlow = 2 * MAX_SINGLE_ENGINE_FUEL_FLOW * state.powerSetting / 100;
    const fuselageFuelConsumedLastPeriod = (totalEngineFuelFlow * state.simSpeedFactor) / (3600 * SIM_CALCULATION_FREQUENCY);

    const fuelAvailableInFuselageSource =
          state.fuelTankSelector == TANK_SELECTOR_WINGS ? (state.fuelWingLeft + state.fuelWingRight) : 0;
    const nominalFuelTransferredToFuselage = (state.simSpeedFactor * PROPORTIONER_PUMPS_FUEL_FLOW) / (3600 * SIM_CALCULATION_FREQUENCY);
    const fuelTransferredToFuselage = state.proportionerPumpsOn ?
          Math.min(fuelAvailableInFuselageSource, nominalFuelTransferredToFuselage) :
          0;
    const netFuselageFlow = fuelTransferredToFuselage - fuselageFuelConsumedLastPeriod;
    state.fuelFuselage = Math.max(state.fuelFuselage + netFuselageFlow, 0);

    // wing tanks
    // the proportioner pumps draw equally from each side, but presumably will draw the whole amount from one side if the other is empty
    const wingFuelTransferredToFuselage = (state.fuelTankSelector == TANK_SELECTOR_WINGS) ? fuelTransferredToFuselage : 0;
    // left tank
    const leftWingNominalOutflow = Math.min(state.fuelWingLeft, wingFuelTransferredToFuselage / 2);
    const rightWingNominalOutflow = Math.min(state.fuelWingRight, wingFuelTransferredToFuselage / 2);
    const leftWingOutflow = wingFuelTransferredToFuselage - rightWingNominalOutflow;
    state.fuelWingLeft = Math.max(state.fuelWingLeft - leftWingOutflow, 0)
    const rightWingOutflow = wingFuelTransferredToFuselage - leftWingNominalOutflow;
    state.fuelWingRight = Math.max(state.fuelWingRight - rightWingOutflow, 0)

  };

  const PROPORTIONER_PUMPS_FUEL_ON = 450;
  const PROPORTIONER_PUMPS_FUEL_OFF = 500; // manual specifieds 520 +/- 20, but max fuel is 514

  const updateSimulation = () => {
    // Calculation of fuel flows/levels is retrospective - the fuel used in the
    // last simulation period will be calculated and deducted in this period to
    // bring up to date. This done first, before any decisions or indications
    // are made based on fuel state.
    updateFuelLevels();

    state.powerSetting = engineCanRun() ? throttlePosition() : 0;
    state.proportionerPumpsOn = engineIsRunning() &&
      (state.fuelTankSelector != TANK_SELECTOR_SEAT) &&
      (state.fuelFuselage < PROPORTIONER_PUMPS_FUEL_ON ||
       (state.fuelFuselage < PROPORTIONER_PUMPS_FUEL_OFF && state.proportionerPumpsOn));
  };

  const renderPump = (pumpName, isOn, hasPressure) => {
    document.querySelectorAll(`g[name="${pumpName}"] g[name="impeller"]`).forEach(impeller => {
      impeller.style.setProperty('transform-box', 'fill-box');
      impeller.style.setProperty('transform-origin', 'center');
      impeller.
        querySelector('animateTransform').
        setAttribute('to', isOn ? '60' : '0');
    });

    document.
      querySelector(`g[name="${pumpName}"] [name="background"]`).
      style.setProperty('fill', hasPressure ? FUEL_LINE_COLOUR : 'white');
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
    document.
      querySelector('path[name="fuelLineFuselageToEngine"]').
      style.setProperty('fill', engineIsRunning() ? FUEL_LINE_COLOUR : 'white');

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

  const renderFuelPanel = () => {
    // fuselage/internal gauge
    const GAUGE1_ANGULAR_RATE = 147; // degrees per 1000 lbs of fuel

    let indicatorStyle = document.querySelector('g[name="fuelPanel"] g[name="gaugeFuel1"] path[name="indicatorFuselage"]').style;
    indicatorStyle.setProperty('transform', `rotate(${ state.fuelFuselage * GAUGE1_ANGULAR_RATE / 1000 }deg)`);
    indicatorStyle.setProperty('transform-box', 'fill-box');
    indicatorStyle.setProperty('transform-origin', 'center');

    indicatorStyle = document.querySelector('g[name="fuelPanel"] g[name="gaugeFuel1"] path[name="indicatorInternal"]').style;
    const totalFuel = state.fuelFuselage + state.fuelWingLeft + state.fuelWingRight;
    indicatorStyle.setProperty('transform', `rotate(${ totalFuel * GAUGE1_ANGULAR_RATE / 1000 }deg)`);
    indicatorStyle.setProperty('transform-box', 'fill-box');
    indicatorStyle.setProperty('transform-origin', 'center');

    // wings gauge
    const GAUGE2_ANGULAR_RATE = 38.75; // degrees per 100 lbs of fuel

    indicatorStyle = document.querySelector('g[name="fuelPanel"] g[name="gaugeFuel2"] path[name="indicatorWingLeft"]').style;
    indicatorStyle.setProperty('transform', `rotate(${ state.fuelWingLeft * GAUGE2_ANGULAR_RATE / 100 }deg)`);
    indicatorStyle.setProperty('transform-box', 'fill-box');
    indicatorStyle.setProperty('transform-origin', 'center');

    indicatorStyle = document.querySelector('g[name="fuelPanel"] g[name="gaugeFuel2"] path[name="indicatorWingRight"]').style;
    indicatorStyle.setProperty('transform', `rotate(${ state.fuelWingRight * GAUGE2_ANGULAR_RATE / 100 }deg)`);
    indicatorStyle.setProperty('transform-box', 'fill-box');
    indicatorStyle.setProperty('transform-origin', 'center');

    render3PositionSwitch(
      'g[name="fuelPanel"] g[name="switchFuelSelector"]',
      state.fuelTankSelector == TANK_SELECTOR_SEAT ? SWITCH_3_POS_UP :
        state.fuelTankSelector == TANK_SELECTOR_WINGS ? SWITCH_3_POS_MIDDLE :
        SWITCH_3_POS_DOWN
    );
  };

  const renderProportionerLines = () => {
    const hasLeftWingFuel = state.fuelWingLeft > 0;
    const hasRightWingFuel = state.fuelWingRight > 0;
    const hasWingFuel = hasLeftWingFuel || hasRightWingFuel;
    const hasFuel = state.fuelTankSelector == TANK_SELECTOR_WINGS ?
          hasWingFuel :
          false;
    renderPump('pumpProportioners', state.proportionerPumpsOn, state.proportionerPumpsOn && hasFuel);

    document.querySelector('path[name="fuelLineWingToFuselageLeft"]').
      style.setProperty('fill', ((state.fuelTankSelector == TANK_SELECTOR_WINGS) && state.proportionerPumpsOn && hasLeftWingFuel) ? FUEL_LINE_COLOUR : 'white');
    document.querySelector('path[name="fuelLineWingToFuselageRight"]').
      style.setProperty('fill', ((state.fuelTankSelector == TANK_SELECTOR_WINGS) && state.proportionerPumpsOn && hasRightWingFuel) ? FUEL_LINE_COLOUR : 'white');
  };

  const renderWingTanks = () => {
    renderFuelTankIndicator('indicatorFuelWingLeft', state.fuelWingLeft, MAX_WING_FUEL);
    renderFuelTankIndicator('indicatorFuelWingRight', state.fuelWingRight, MAX_WING_FUEL);
  };

  const renderSeatTank = () => {
    renderFuelTankIndicator('indicatorFuelSeat', state.fuelSeat, MAX_SEAT_FUEL);
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
