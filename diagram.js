window.app = function() {

  const SIM_CALCULATION_FREQUENCY = 4; // the frequency of sim loops
  const DEFAULT_SIM_SPEED_FACTOR = 1; // rate of simulation relative to real time
  const MAX_SINGLE_ENGINE_FUEL_FLOW = 3200; // lbs / hr
  const FUEL_LINE_COLOUR = '#36d4dc';
  const MAX_FUSELAGE_FUEL = 514;

  /* Runtime */

  const state = {
    simSpeedFactor: DEFAULT_SIM_SPEED_FACTOR,
    powerSetting: 0,
    batteryMasterOn: false,
    fuelFuselage: MAX_FUSELAGE_FUEL,
    proportionerPumpsOn: false,
  };

  const throttlePosition = () =>
    document.getElementById('throttle').valueAsNumber;

  const engineCanRun = () => state.batteryMasterOn && state.fuelFuselage > 0;

  const engineIsRunning = () => state.powerSetting > 0;

  const updateFuelLevels = () => {
    // fuselage tank
    const totalEngineFuelFlow = 2 * MAX_SINGLE_ENGINE_FUEL_FLOW * state.powerSetting / 100;
    const fuelConsumedLastPeriod = (totalEngineFuelFlow * state.simSpeedFactor) / (3600 * SIM_CALCULATION_FREQUENCY);
    state.fuelFuselage = Math.max(state.fuelFuselage - fuelConsumedLastPeriod, 0);
  };

  const PROPORTIONER_PUMPS_FUEL_ON = 450;
  const PROPORTIONER_PUMPS_FUEL_OFF = 500;

  const updateSimulation = () => {
    // Calculation of fuel flows/levels is retrospective - the fuel used in the
    // last simulation period will be calculated and deducted in this period to
    // bring up to date. This done first, before any decisions or indications
    // are made based on fuel state.
    updateFuelLevels();

    state.powerSetting = engineCanRun() ? throttlePosition() : 0;
    state.proportionerPumpsOn = engineIsRunning() &&
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

  const renderFuselageTank = () => {
    renderPump('pumpFuselage', state.batteryMasterOn, state.batteryMasterOn && state.fuelFuselage > 0);

    const indicator = document.querySelector('g[name="indicatorFuelFuselage"]');
    indicator.querySelector('text').textContent = `${new String(Math.floor(state.fuelFuselage)).padStart(3, "0")} lbs`;

    const barStyle = indicator.querySelector('rect[name="barGauge"]').style;
    barStyle.setProperty('transform', `scaleY(${ state.fuelFuselage / MAX_FUSELAGE_FUEL })`);
    barStyle.setProperty('transform-box', 'fill-box');
    barStyle.setProperty('transform-origin', 'bottom');
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

  const renderFuelPanel = () => {
    // fuselage/total gauge
    const GAUGE1_ANGULAR_RATE = 147; // degrees per 1000 lbs of fuel
    let indicatorStyle = document.querySelector('g[name="fuelPanel"] g[name="gaugeFuel1"] path[name="indicatorFuselage"]').style;
    indicatorStyle.setProperty('transform', `rotate(${ state.fuelFuselage * GAUGE1_ANGULAR_RATE / 1000 }deg)`);
    indicatorStyle.setProperty('transform-box', 'fill-box');
    indicatorStyle.setProperty('transform-origin', 'center');
  };

  const renderProportionerLines = () => {
    renderPump('pumpProportioners', state.proportionerPumpsOn, false);
  };

  const renderUI = () => {
    renderBatteryMasterSwitch();
    renderEngines();
    renderFuselageTank();
    renderSimulationControls();
    renderAnnunciatorPanel();
    renderFuelPanel();
    renderProportionerLines();
  };

  const runSimulation = () => {
    updateSimulation();
    renderUI();
  };

  /* end runtime */

  /* Event handlers */

  const throttleChangedHandler = () => {
  };

  const prepareFuselageFuelChange = () => {
    const indicatorGroup = document.querySelector('g[name="indicatorFuelFuselage"]');
    const input =  indicatorGroup.querySelector('input[type="text"]');
    input.value = Math.floor(state.fuelFuselage);
    input.style.setProperty('display', 'inline');
    input.select();

    indicatorGroup.querySelector('text').style.setProperty('display', 'none');
  };

  const handleFuselageFuelChange = () => {
    const indicatorGroup = document.querySelector('g[name="indicatorFuelFuselage"]');
    const textInput = indicatorGroup.querySelector('input[type="text"]');
    const newLevel = Number.parseInt(textInput.value);
    if (!!newLevel || newLevel == 0) {
      state.fuelFuselage = Math.min(Math.max(newLevel, 0), MAX_FUSELAGE_FUEL);
    }

    textInput.style.setProperty('display', 'none');
    indicatorGroup.
      querySelector('text').
      style.setProperty('display', 'inline');
  };

  /* end event handlers */

  /* Initialisation */

  const addEventHandlers = () => {
    document.getElementById('throttle').oninput = throttleChangedHandler;
    document.querySelector('g[name="switchBatteryOn"]').onclick = () => { state.batteryMasterOn = false; };
    document.querySelector('g[name="switchBatteryOff"]').onclick = () => { state.batteryMasterOn = true; };
    document.querySelector('g[name="indicatorFuelFuselage"] text').onclick = prepareFuselageFuelChange;
    document.querySelector('g[name="indicatorFuelFuselage"] input[type="text"]').onblur = handleFuselageFuelChange;
    document.querySelector('g[name="buttonSimSpeedNormal"]').onclick = () => { state.simSpeedFactor = 1; };
    document.querySelector('g[name="buttonSimSpeedFaster"]').onclick = () => { state.simSpeedFactor = Math.min(state.simSpeedFactor * 2, 32); };
    document.querySelector('g[name="buttonSimSpeedSlower"]').onclick = () => { state.simSpeedFactor = Math.max(state.simSpeedFactor / 2, 1); };
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
