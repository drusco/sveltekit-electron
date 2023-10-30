const windowStateManager = require('electron-window-state');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const serve = require('electron-serve');
const settings = require('electron-settings');
const path = require('path');
const jsonrawtoxlsx = require('jsonrawtoxlsx');
const fs = require('node:fs');

try {
	require('electron-reloader')(module);
} catch (e) {
	console.error(e);
}

(async () => {
	const serveURL = serve({ directory: '.' });
	const port = process.env.PORT || 5173;
	const dev = !app.isPackaged;
	let mainWindow;

	await init().catch(console.log);

	async function init() {
		settings.configure({
			numSpaces: 2,
			prettify: true,
		});
	}

	function createWindow() {
		const width = 800;
		const height = 600;

		let windowState = windowStateManager({
			defaultWidth: width,
			defaultHeight: height,
		});

		const mainWindow = new BrowserWindow({
			backgroundColor: 'whitesmoke',
			titleBarStyle: 'hidden',
			autoHideMenuBar: true,
			trafficLightPosition: {
				x: 17,
				y: 32,
			},
			minHeight: height,
			minWidth: width,
			webPreferences: {
				enableRemoteModule: true,
				contextIsolation: true,
				nodeIntegration: true,
				spellcheck: false,
				devTools: dev,
				preload: path.join(__dirname, 'preload.cjs'),
			},
			x: windowState.x,
			y: windowState.y,
			width: windowState.width,
			height: windowState.height,
		});

		windowState.manage(mainWindow);

		mainWindow.once('ready-to-show', () => {
			mainWindow.show();
			mainWindow.focus();
		});

		mainWindow.on('close', () => {
			windowState.saveState(mainWindow);
		});

		return mainWindow;
	}

	function loadVite(port) {
		mainWindow.loadURL(`http://localhost:${port}`).catch((e) => {
			setTimeout(() => {
				loadVite(port);
			}, 200);
		});
	}

	function createMainWindow() {
		mainWindow = createWindow();
		mainWindow.once('close', () => {
			mainWindow = null;
		});

		if (dev) loadVite(port);
		else serveURL(mainWindow);

		mainWindow.webContents.openDevTools({ mode: 'right' });
	}

	async function getAppSettings() {
		if (!mainWindow) return;

		const options = await settings.get('options');
		const form = await settings.get('form');

		return { options, form };
	}

	app.once('ready', createMainWindow);
	app.disableHardwareAcceleration();

	app.on('activate', () => {
		if (!mainWindow) {
			createMainWindow();
		}
	});

	app.on('window-all-closed', () => {
		if (process.platform !== 'darwin') app.quit();
	});

	ipcMain.handle('settings', async () => {
		return await getAppSettings();
	});

	ipcMain.handle('download-path', async () => {
		return app.getPath('downloads');
	});

	ipcMain.handle('select-download-path', async () => {
		const result = await dialog.showOpenDialog(mainWindow, {
			properties: ['openDirectory'],
		});
		return result.filePaths[0];
	});

	ipcMain.handle('empresas', async (event, empresas) => {
		const buffer = jsonrawtoxlsx(
			empresas.map(
				({
					cnpj,
					cnpj_raiz,
					filial_numero,
					razao_social,
					nome_fantasia,
					data_abertura,
					situacao_cadastral,
					logradouro,
					numero,
					bairro,
					municipio,
					uf,
					atividade_principal,
					cnpj_mei,
					telefones,
					email,
				}) => {
					return {
						CNPJ: cnpj,
						cnpj_raiz,
						filial_numero,
						razao_social,
						nome_fantasia,
						data_abertura,
						situacao_cadastral,
						logradouro,
						numero,
						bairro,
						municipio,
						uf,
						atividade_principal: `${atividade_principal.codigo} - ${atividade_principal.descricao}`,
						cnpj_mei: cnpj_mei === true ? 'sim' : 'não',
						telefones,
						email
					};
				},
			),
		);
		const { options } = await settings.get();
		fs.writeFileSync(
			path.resolve(options.schedule.path, `${options.schedule.filename}.xlsx`),
			buffer,
			'binary',
		);
	});

	ipcMain.on('settings', async (event, newSettings) => {
		await settings.set(newSettings);
	});
})();
