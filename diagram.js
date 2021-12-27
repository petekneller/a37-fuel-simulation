window.app = function() {

  const SIM_SCALING_FACTOR = 4; // the frequency of sim loops

  /* Runtime */

  const state = {
    powerSetting: 0
  };

  const throttlePosition = () =>
    document.getElementById('throttle').valueAsNumber;

  const engineCanRun = () => true;

  const updateSimulation = () => {
    state.powerSetting = engineCanRun() ? throttlePosition() : 0;
  };

  const updateUI = () => {
    // To show or not the heat gradient in the engine
    document.querySelectorAll('linearGradient[name="engine"] stop').forEach(stop =>
      stop.style.setProperty('stop-opacity', state.powerSetting > 0 ? '1' : '0')
    );

    // The level of heat in the engine
    // Hue runs from 1 (cold end) to 56
    const hue = Math.round(1 + (55 * state.powerSetting / 100));
    // Luminosity runs from 42 (cold end) to 50
    const lightness = Math.round(42 + (8 * state.powerSetting / 100));
    const color = `hsl(${hue}, 90%, ${lightness}%)`;
    document.querySelector('linearGradient[name="engine"] stop[name="hot"]').style.setProperty('stop-color', color);

    // Rotating compressor
    document.querySelector('pattern[name="compressor"] animate').setAttribute('to',
      state.powerSetting > 0 ? '4' : '0');

  };

  const runSimulation = () => {
    updateSimulation();
    updateUI();
  };

  /* end runtime */

  /* Event handlers */

  const throttleChangedHandler = () => {
  };

  /* end event handlers */

  /* Initialisation */

  const addEventHandlers = () => {
    document.getElementById('throttle').oninput = throttleChangedHandler;
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
    window.setInterval(runSimulation, 1000 / SIM_SCALING_FACTOR);
  };

  /* end initialisation */

  return {
    init
  };

}();

window.onload = function() {
  app.init();
};
