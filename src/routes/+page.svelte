<script lang="ts">
	import '$lib/styles/index.scss';
	import {
		Person,
		Reader,
		Home,
		Mobile,
		Stack,
		Layers,
		Calendar,
		Clock,
		Download,
		MixerHorizontal,
	} from 'radix-icons-svelte';
	import {
		Label,
		Input,
		Toggle,
		Select,
		Button,
		InputAddon,
		ButtonGroup,
		Accordion,
		AccordionItem,
		Dropdown,
		Search,
		Checkbox,
		Progressbar,
	} from 'flowbite-svelte';
	import { onMount } from 'svelte';
	import moment from 'moment';
	import { browser } from '$app/environment';
	import { linear } from 'svelte/easing';

	const HOST = 'https://api.casadosdados.com.br';
	const API = `${HOST}/v4/public`;

	let cnae: formOptionValue[] = [];
	let cnaeFilter: formOptionValue[] = [];
	let cnaeSearch: string;

	let naturezaJuridica: formOptionValue[] = [];
	let naturezaJuridicaFilter: formOptionValue[] = [];
	let naturezaJuridicaSearch: string;

	let settingsLoaded = false;
	let searchInProgress = false;
	let saveInProgress = false;
	let searchProgressValue = '0';
	let downloadPath: string;

	let situacaoCadastral = [
		{ value: 'ATIVA', name: 'ATIVA' },
		{ value: 'BAIXADA', name: 'BAIXADA' },
		{ value: 'INAPTA', name: 'INAPTA' },
		{ value: 'SUSPENSA', name: 'SUSPENSA' },
		{ value: 'NULA', name: 'NULA' },
	];

	type estado =
		| 'AC'
		| 'AL'
		| 'AP'
		| 'AM'
		| 'BA'
		| 'CE'
		| 'DF'
		| 'ES'
		| 'GO'
		| 'MA'
		| 'MT'
		| 'MS'
		| 'MG'
		| 'PA'
		| 'PB'
		| 'PR'
		| 'PE'
		| 'PI'
		| 'RJ'
		| 'RN'
		| 'RS'
		| 'RO'
		| 'RR'
		| 'SC'
		| 'SP'
		| 'SE'
		| 'TO'
		| 'EX';

	let estados: formOptionValue[] = [
		{ value: 'AC', name: 'Acre' },
		{ value: 'AL', name: 'Alagoas' },
		{ value: 'AP', name: 'Amapá' },
		{ value: 'AM', name: 'Amazonas' },
		{ value: 'BA', name: 'Bahia' },
		{ value: 'CE', name: 'Ceará' },
		{ value: 'DF', name: 'Distrito Federal' },
		{ value: 'ES', name: 'Espírito Santo' },
		{ value: 'GO', name: 'Goiás' },
		{ value: 'MA', name: 'Maranhão' },
		{ value: 'MT', name: 'Mato Grosso' },
		{ value: 'MS', name: 'Mato Grosso do Sul' },
		{ value: 'MG', name: 'Minas Gerais' },
		{ value: 'PA', name: 'Pará' },
		{ value: 'PB', name: 'Paraíba' },
		{ value: 'PR', name: 'Paraná' },
		{ value: 'PE', name: 'Pernambuco' },
		{ value: 'PI', name: 'Piauí' },
		{ value: 'RJ', name: 'Rio de Janeiro' },
		{ value: 'RN', name: 'Rio Grande do Norte' },
		{ value: 'RS', name: 'Rio Grande do Sul' },
		{ value: 'RO', name: 'Rondônia' },
		{ value: 'RR', name: 'Roraima' },
		{ value: 'SC', name: 'Santa Catarina' },
		{ value: 'SP', name: 'São Paulo' },
		{ value: 'SE', name: 'Sergipe' },
		{ value: 'TO', name: 'Tocantins' },
		{ value: 'EX', name: 'Exterior' },
	].map((estado) => ({ ...estado, name: `${estado.value} - ${estado.name}` }));

	let estadoFilter: formOptionValue[] = JSON.parse(JSON.stringify(estados));
	let estadoSearch: string;

	let municipios: Record<estado | string, formOptionUf[]> = {};
	let municipioFilter: formOptionValue[] = [];
	let municipioSearch: string;

	interface config {
		active: boolean;
		open: boolean;
	}

	interface scheduleConfig extends config {
		time: string;
		path: string;
		next?: number;
		filename: string;
		limit: number;
	}

	const scheduleConfig: scheduleConfig = {
		active: false,
		open: true,
		time: '',
		path: '',
		next: undefined,
		filename: 'resultados',
		limit: 1000,
	};

	let config = {
		show: false,
		schedule: scheduleConfig,
	};

	interface formOption {
		name: string;
		active?: boolean;
	}

	interface formOptionValue extends formOption {
		value: string;
	}

	interface formOptionCode extends formOption {
		code: string;
	}

	interface formOptionUf extends formOption {
		uf: estado;
	}

	interface form {
		razaoSocial?: string;
		cnae: string[];
		atividadeSecundaria: boolean;
		naturezaJuridica: string[];
		situacaoCadastral: 'ATIVA' | 'BAIXADA' | 'INAPTA' | 'SUSPENSA' | 'NULA';
		estado: estado[];
		municipio: string[];
		bairro?: string;
		cep?: number;
		ddd?: number;
		dataAberturaDe?: number;
		dataAberturaAte?: number;
		capitalSocialDe?: number;
		capitalSocialAte?: number;
		somenteMei: boolean;
		excluirMei: boolean;
		somenteMatriz: boolean;
		somenteFilial: boolean;
		comTelefone: boolean;
		somenteCelular: boolean;
		somenteFixo: boolean;
		comEmail: boolean;
	}

	let form: form = {
		razaoSocial: undefined,
		cnae: [],
		atividadeSecundaria: false,
		naturezaJuridica: [],
		situacaoCadastral: 'ATIVA',
		estado: [],
		municipio: [],
		bairro: undefined,
		cep: undefined,
		ddd: undefined,
		dataAberturaDe: undefined,
		dataAberturaAte: undefined,
		capitalSocialDe: undefined,
		capitalSocialAte: undefined,
		somenteMei: false,
		excluirMei: false,
		somenteMatriz: false,
		somenteFilial: false,
		comTelefone: false,
		somenteCelular: false,
		somenteFixo: false,
		comEmail: false,
	};

	let scheduleInterval: any;

	$: {
		filterCnae(cnaeSearch);
		filterNaturezaJuridica(naturezaJuridicaSearch);
		filterEstado(estadoSearch);
		filterMunicipio(municipioSearch);

		if (settingsLoaded) {
			if (!config.schedule.path) {
				config.schedule.path = downloadPath;
			}

			if (!config.schedule.filename) {
				config.schedule.filename = 'resultados';
			}

			if (config.schedule.limit < 1) {
				config.schedule.limit = 0;
			}

			if (config.schedule.active) {
				clearInterval(scheduleInterval);
				scheduleInterval = setInterval(work, 1000);
				if (!config.schedule.time) {
					config.schedule.time = '00:00';
				}
			} else {
				clearInterval(scheduleInterval);
			}

			window.electron.send('settings', { form, options: config });
		}
	}

	const work = () => {
		const now = moment();
		const schedule = getScheduleMoment();

		if (now.isAfter(schedule)) {
			config.schedule.next = schedule.add(1, 'day').toDate().getTime();
			search(1, config.schedule.limit);
		}
	};

	const getScheduleMoment = (useStored: boolean = true) => {
		const schedule = moment(useStored ? config.schedule.next : undefined);
		const [hour, minutes] = config.schedule.time.split(':');
		schedule.set({ hour: parseInt(hour, 10), minutes: parseInt(minutes, 10), seconds: 0 });
		return schedule;
	};

	const onScheduleChange = () => {
		config.schedule.next = getScheduleMoment(false).toDate().getTime();
		console.log('schedule changed');
	};

	const selectPath = async () => {
		const path = await window.electron.invoke('select-download-path');
		config.schedule.path = path;
	};

	const fetchCnae = async () => {
		const response = await fetch(`${API}/cnpj/busca/cnae`, {
			method: 'GET',
		});
		const values: formOptionCode[] = await response.json();
		cnae = values.map((values) => {
			const { name, code } = values;
			return {
				name: `${code} - ${name}`,
				value: code,
				active: false,
			};
		});
		cnaeFilter = JSON.parse(JSON.stringify(cnae));
	};

	const filterCnae = (keyword?: string) => {
		const selected = cnaeFilter.filter((cnae) => cnae.active);

		const match = cnae.filter((values) => {
			const { name, value } = values;
			const notSelected = !selected.some((cnae) => cnae.value === value);

			if (!keyword) return notSelected;

			return name.toLowerCase().includes(keyword.toLowerCase()) && notSelected;
		});

		cnaeFilter = JSON.parse(JSON.stringify([...selected, ...match]));
	};

	const onCnaeChange = () => {
		const selected = cnaeFilter
			.filter((selection) => selection.active)
			.map((selection) => selection.value);
		form.cnae = selected;
	};

	const clearCnaeFilter = () => {
		cnaeFilter = JSON.parse(JSON.stringify(cnae));
		cnaeSearch = '';
		form.cnae = [];
	};

	const fetchNaturezaJuridica = async () => {
		const response = await fetch(`${API}/cnpj/busca/natureza-juridica`, {
			method: 'GET',
		});
		const values: formOptionCode[] = await response.json();
		naturezaJuridica = values.map((values) => {
			const { name, code } = values;
			return {
				name: `${code} - ${name}`,
				value: code,
				active: false,
			};
		});
		naturezaJuridicaFilter = JSON.parse(JSON.stringify(naturezaJuridica));
	};

	const filterNaturezaJuridica = (keyword?: string) => {
		const selected = naturezaJuridicaFilter.filter((nj) => nj.active);

		const match = naturezaJuridica.filter((values) => {
			const { name, value } = values;
			const notSelected = !selected.some((nj) => nj.value === value);

			if (!keyword) return notSelected;

			return name.toLowerCase().includes(keyword.toLowerCase()) && notSelected;
		});

		naturezaJuridicaFilter = JSON.parse(JSON.stringify([...selected, ...match]));
	};

	const onNaturezaJuridicaChange = () => {
		const selected = naturezaJuridicaFilter
			.filter((selection) => selection.active)
			.map((selection) => selection.value);
		form.naturezaJuridica = selected;
	};

	const clearNaturezaJuridicaFilter = () => {
		naturezaJuridicaFilter = JSON.parse(JSON.stringify(naturezaJuridica));
		naturezaJuridicaSearch = '';
		form.naturezaJuridica = [];
	};

	const filterEstado = (keyword?: string) => {
		const selected = estadoFilter.filter((uf) => uf.active);

		const match = estados.filter((uf) => {
			const { name, value } = uf;
			const notSelected = !selected.some((uf) => uf.value === value);

			if (!keyword) return notSelected;

			return name.toLowerCase().includes(keyword.toLowerCase()) && notSelected;
		});

		estadoFilter = JSON.parse(JSON.stringify([...selected, ...match]));
	};

	const onEstadoChange = async () => {
		const selected = estadoFilter
			.filter((selection) => selection.active)
			.map((selection) => selection.value);

		form.estado = selected as estado[];

		const promises = Promise.all(
			form.estado.map((UF) => {
				if (!municipios[UF]) {
					return fetchMunicipio(UF);
				}
			}),
		);

		await promises;

		const availableMunicipios = getMunicipios(form.estado);
		const selectedMunicipios = availableMunicipios
			.filter((selection) =>
				municipioFilter.some((muni) => muni.name === selection.name && muni.active),
			)
			.map((muni) => ({ ...muni, active: true }));
		const unselectedMunicipios = availableMunicipios.filter(
			(selection) => !selectedMunicipios.some((muni) => selection.name === muni.name),
		);

		municipioFilter = [...selectedMunicipios, ...unselectedMunicipios];
		form.municipio = selectedMunicipios.map((muni) => muni.value);
	};

	const clearEstadoFilter = () => {
		estadoFilter = JSON.parse(JSON.stringify(estados));
		municipioFilter = [];
		estadoSearch = '';
		form.estado = [];
		form.municipio = [];
	};

	const fetchMunicipio = async (UF: estado) => {
		const response = await fetch(`${API}/cnpj/busca/municipio/${UF}`, {
			method: 'GET',
		});
		const values: formOptionUf[] = await response.json();
		municipios[UF] = values;
	};

	const getMunicipios = (estados: estado[] = []) => {
		const municipio = Object.keys(municipios)
			.filter((UF) => {
				return estados.includes(UF as estado);
			})
			.map((UF) => {
				const values = municipios[UF];
				const options: formOptionValue[] = values.map((value) => ({
					name: `${value.name} - ${value.uf}`,
					value: value.name,
				}));
				return options;
			})
			.flat();

		return municipio;
	};

	const filterMunicipio = (keyword?: string) => {
		const selected = municipioFilter.filter((municipio) => municipio.active);

		const match = getMunicipios(form.estado).filter((municipio) => {
			const { name, value } = municipio;
			const notSelected = !selected.some((municipio) => municipio.value === value);

			if (!keyword) return notSelected;

			return name.toLowerCase().includes(keyword.toLowerCase()) && notSelected;
		});

		municipioFilter = JSON.parse(JSON.stringify([...selected, ...match]));
	};

	const onMunicipioChange = () => {
		const selected = municipioFilter
			.filter((selection) => selection.active)
			.map((selection) => selection.value);

		form.municipio = selected;
	};

	const clearMunicipioFilter = () => {
		municipioFilter = getMunicipios(form.estado);
		municipioSearch = '';
		form.municipio = [];
	};

	const getPayload = (page: number = 1) => {
		return {
			query: {
				termo: [],
				atividade_principal: form.cnae,
				natureza_juridica: form.naturezaJuridica,
				uf: form.estado,
				municipio: form.municipio,
				bairro: form.bairro ? [form.bairro] : [],
				situacao_cadastral: form.situacaoCadastral,
				cep: form.cep ? [form.cep] : [],
				ddd: form.ddd ? [form.ddd] : [],
			},
			range_query: {
				data_abertura: {
					lte: form.dataAberturaDe || null,
					gte: form.dataAberturaAte || null,
				},
				capital_social: {
					lte: form.capitalSocialDe || null,
					gte: form.capitalSocialAte || null,
				},
			},
			extras: {
				somente_mei: form.somenteMei,
				excluir_mei: form.excluirMei,
				com_email: form.comEmail,
				incluir_atividade_secundaria: form.atividadeSecundaria,
				com_contato_telefonico: form.comTelefone,
				somente_fixo: form.somenteFixo,
				somente_celular: form.somenteCelular,
				somente_matriz: form.somenteMatriz,
				somente_filial: form.somenteFilial,
			},
			page,
		};
	};

	const searchByPage = async (page: number = 1) => {
		const payload = getPayload(page);
		const response = await fetch(`${HOST}/v2/public/cnpj/search`, {
			method: 'POST',
			headers: {
				['Content-Type']: 'application/json',
			},
			body: JSON.stringify(payload),
		});
		return await response.json();
	};

	const searchByCNPJ = async (CNPJ: string = '') => {
		const response = await fetch(`${HOST}/v2/public/cnpj/${CNPJ}`, {
			method: 'GET',
			headers: {
				['Content-Type']: 'application/json',
			},
		});
		return await response.json();
	};

	function* arrayToChunks(arr: any[], n: number) {
		for (let i = 0; i < arr.length; i += n) {
			yield arr.slice(i, i + n);
		}
	}

	const search = async (currentPage: number = 1, limit: number = 1000) => {
		searchInProgress = true;
		searchProgressValue = '0';
		let results: any[] = [];
		const { success, data, message } = await searchByPage(currentPage).catch((err) =>
			alert(err.message),
		);

		if (!success) {
			searchInProgress = false;
			return alert(message);
		}

		results = data.cnpj;

		const totalItems = limit || data.count;
		const itemsPerPage = data.cnpj.length;
		const pages = Math.ceil(data.count / itemsPerPage);
		const limitedPages = Math.ceil(limit / itemsPerPage);
		const totalPages = limit > 0 ? limitedPages : pages;

		const chunkSize = 50;
		const arrayOfPages = Array.from({ length: totalPages }, (_, i) => i + (currentPage + 1));
		const chunkOfPages: Generator<number[]> = arrayToChunks(arrayOfPages, chunkSize);

		const addExtraData = async (results: any[]) => {
			const dataPromises = results.map(async (empresa) => {
				const res = await searchByCNPJ(empresa.cnpj).catch(console.log);
				if (res.status === 'ok') {
					const data = res.cnpj;
					empresa.telefones = data.telefones?.join(', ') || '';
					empresa.email = data.email;
				} else {
					empresa.telefones = '';
					empresa.email = '';
				}
			});
			await Promise.allSettled(dataPromises);
		};

		const beforeFile = async () => {
			let index = 0;
			saveInProgress = true;
			const resultChunks = arrayToChunks(results, chunkSize);
			for (let chunk of resultChunks) {
				index++;
				await addExtraData(chunk);
				searchProgressValue = ((index * chunkSize * 100) / totalItems).toFixed(1);
			}
			saveInProgress = false;
		};

		const doSearch = async () => {
			console.log('searching...');
			const state = chunkOfPages.next();
			const promises = [];

			if (state.value) {
				for (let page of state.value) {
					console.log(page, totalPages);
					searchProgressValue = (((page - 1) * 100) / totalPages).toFixed(1);
					promises.push(
						searchByPage(page)
							.catch(console.log)
							.then(({ success, data }) => {
								if (success) {
									results = [...results, ...data.cnpj];
								}
							}),
					);
				}
			}

			await Promise.allSettled(promises);

			if (state.done) {
				console.log('search ends here');
				if (limit) results.splice(limit);
				await beforeFile();
				await window.electron.invoke('empresas', results);
				setTimeout(() => {
					searchInProgress = false;
				}, 1000);
			} else {
				doSearch();
			}
		};

		doSearch();
	};

	const clearFilters = () => {
		form = {
			razaoSocial: undefined,
			cnae: [],
			atividadeSecundaria: false,
			naturezaJuridica: [],
			situacaoCadastral: 'ATIVA',
			estado: [],
			municipio: [],
			bairro: undefined,
			cep: undefined,
			ddd: undefined,
			dataAberturaDe: undefined,
			dataAberturaAte: undefined,
			capitalSocialDe: undefined,
			capitalSocialAte: undefined,
			somenteMei: false,
			excluirMei: false,
			somenteMatriz: false,
			somenteFilial: false,
			comTelefone: false,
			somenteCelular: false,
			somenteFixo: false,
			comEmail: false,
		};
		clearCnaeFilter();
		clearEstadoFilter();
		clearNaturezaJuridicaFilter();
		clearMunicipioFilter();
	};

	const toggleFilters = () => {
		config = { ...config, show: !config.show };
	};

	const onScheduleTimePickerClick = (e: any) => {
		if (!e.target) return;
		if (!e.target.showPicker) return;
		e.target.showPicker();
	};

	let empresas = [];

	onMount(async () => {
		fetchCnae();
		fetchNaturezaJuridica();

		if (window.electron && browser) {
			const currentSettings = await window.electron.invoke('settings');
			if (currentSettings) {
				const { form: formSettings, options: optionsConfig } = currentSettings;
				if (formSettings) form = formSettings;
				if (optionsConfig) config = optionsConfig;
			}
			downloadPath = await window.electron.invoke('download-path');
			settingsLoaded = true;
		}
	});
</script>

<svelte:head>
	<title>CNPJ Dados</title>
</svelte:head>

<section
	class="absolute w-full h-full flex flex-col overflow-hidden text-neutral-900 min-w-[600px]"
>
	<div class="h-full w-full flex overflow-hidden">
		<aside
			class={[
				'h-full bg-neutral-800 transition-all overflow-hidden text-white',
				`${config.show ? 'w-[500px]' : 'w-0'}`,
			].join(' ')}
		>
			<section class="h-full flex flex-col">
				<div class="bg-neutral-900 p-3">
					<div class="w-full flex items-center">
						<div>Configuração</div>
						<div class="ml-auto" />
					</div>
				</div>

				<Accordion flush multiple class="p-0 h-full">
					<AccordionItem
						bind:open={config.schedule.open}
						class={[
							'p-4 w-full !rounded-none bg-neutral-800 !ring-0 !outline-none',
							`${config.schedule.active ? 'text-white' : 'text-neutral-400'}`,
						].join(' ')}
						paddingFlush="p-0"
						borderClass="border-0"
						borderBottomClass="border-0"
					>
						<div slot="arrowup" />
						<span slot="arrowdown" />
						<div slot="header" class="flex w-full">
							<div class="flex items-center">
								<Clock class="mr-2" />
								<span class="text-sm">Programar pesquisa</span>
							</div>
							<Toggle
								bind:checked={config.schedule.active}
								size="small"
								class="toggle ml-auto"
							/>
						</div>
						<section class="p-4 space-y-3 h-full overflow-auto bg-neutral-900">
							<div>
								<Label for="schedule-time" class="text-inherit">Horario</Label>
								<div class="text-stone-500 my-2 text-xs">
									Seguinte: {moment(config.schedule.next).format(
										'DD-MM-YYYY HH:mm',
									)}
								</div>
								<Input
									id="schedule-time"
									class="bg-transparent border-neutral-500 text-inherit"
									size="sm"
									type="time"
									bind:value={config.schedule.time}
									disabled={!config.schedule.active}
									on:click={onScheduleTimePickerClick}
									on:change={onScheduleChange}
								/>
							</div>
							<div>
								<Label for="schedule-path" class="text-inherit mb-2">
									Selecione pasta
								</Label>
								<ButtonGroup class="w-full" size="sm">
									<InputAddon class="px-1 bg-neutral-800 border-neutral-600">
										<Button
											id="schedule-path"
											color="none"
											class="!ring-0 text-neutral-200"
											disabled={!config.schedule.active}
											on:click={selectPath}
										>
											<Download />
										</Button>
									</InputAddon>
									<Input
										readonly
										class="text-inherit bg-transparent cursor-pointer border-neutral-500"
										disabled={!config.schedule.active}
										placeholder={config.schedule.path}
										bind:value={config.schedule.path}
										on:click={selectPath}
									/>
								</ButtonGroup>
							</div>
							<div>
								<Label for="schedule-name" class="text-inherit mb-2">
									Nome do arquivo
								</Label>
								<Input
									id="schedule-name"
									class="text-inherit bg-transparent cursor-pointer border-neutral-500"
									disabled={!config.schedule.active}
									bind:value={config.schedule.filename}
								/>
							</div>
							<div>
								<Label for="schedule-limit" class="text-inherit mb-2">
									Limite dos resultados
								</Label>
								<Input
									id="schedule-limit"
									class="text-inherit bg-transparent cursor-pointer border-neutral-500"
									disabled={!config.schedule.active}
									type="number"
									bind:value={config.schedule.limit}
								/>
							</div>
						</section>
					</AccordionItem>
				</Accordion>

				<!-- <div class="p-3 bg-neutral-900 font-bold space-x-2">
					<Button
						size="sm"
						color="none"
						class="!ring-neutral-700 bg-neutral-800"
						on:click={saveSettings}
					>
						Salvar configurações
					</Button>
				</div> -->
			</section>
		</aside>
		<section class="h-full w-full flex flex-col">
			<div class="bg-neutral-200 text-neutral-600">
				<div class="p-3 w-full flex items-center">
					<div class="mr-3">
						<Button size="sm" color="alternative" class="p-1" on:click={toggleFilters}>
							<MixerHorizontal size={15} />
						</Button>
					</div>
					<div>Pesquisa avançada</div>
				</div>
			</div>
			<div class="h-full flex flex-col p-5 space-y-4 overflow-auto relative">
				<div class="grid grid-cols sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<div>
						<Label for="razao-social" class="flex items-center mb-2">
							<Person class="mr-2" />
							<span>Razão Social ou Nome Fantasia</span>
						</Label>
						<Input
							id="razao-social"
							size="sm"
							placeholder=""
							bind:value={form.razaoSocial}
						/>
					</div>

					<div>
						<Label class="flex items-center mb-2">
							<Reader class="mr-2" />
							<span>Atividade Principal (CNAE)</span>
						</Label>

						<Button
							color="alternative"
							size="lg"
							class="w-full flex items-center justify-between focus:ring-2 focus:ring-primary-500"
							on:click={() => {
								cnaeSearch = '';
								filterCnae();
							}}
						>
							<div class="text-xs font-normal truncate">
								{form.cnae.join(', ')}
							</div>
							<div class="ml-2 chevron-down flex-none" />
						</Button>
						<Dropdown
							placement="bottom"
							class="rounded overflow-y-auto p-0 flex flex-col text-sm h-44 max-w-sm"
						>
							<header slot="header" class="p-3">
								<Search
									size="md"
									bind:value={cnaeSearch}
									placeholder="Código ou nome da atividade"
								/>
							</header>

							{#each cnaeFilter as cnae (cnae.value)}
								<li class="p-3 hover:bg-gray-100">
									<Checkbox bind:checked={cnae.active} on:change={onCnaeChange}>
										<span class="font-normal">{cnae.name}</span>
									</Checkbox>
								</li>
							{/each}

							<footer slot="footer" class="p-2 m-0">
								<Button on:click={clearCnaeFilter} color="alternative" size="xs">
									Limpar
								</Button>
							</footer>
						</Dropdown>

						<Toggle
							bind:checked={form.atividadeSecundaria}
							size="small"
							class="mt-4 mx-1"
						>
							<span class="font-normal">Incluir Atividade Secundária</span>
						</Toggle>
					</div>

					<div>
						<Label class="flex items-center mb-2">
							<Reader class="mr-2" />
							<span>Natureza Jurídica</span>
						</Label>
						<Button
							color="alternative"
							size="lg"
							class="w-full flex items-center justify-between focus:ring-2 focus:ring-primary-500"
							on:click={() => {
								naturezaJuridicaSearch = '';
								filterNaturezaJuridica();
							}}
						>
							<div class="text-xs font-normal truncate">
								{form.naturezaJuridica.join(', ')}
							</div>
							<div class="ml-2 chevron-down flex-none" />
						</Button>
						<Dropdown
							placement="bottom"
							class="rounded overflow-y-auto p-0 flex flex-col text-sm h-44 max-w-sm"
						>
							<header slot="header" class="p-3">
								<Search
									size="md"
									bind:value={naturezaJuridicaSearch}
									placeholder="Código ou nome da atividade"
								/>
							</header>

							{#each naturezaJuridicaFilter as nj (nj.value)}
								<li class="p-3 hover:bg-gray-100">
									<Checkbox
										bind:checked={nj.active}
										on:change={onNaturezaJuridicaChange}
									>
										<span class="font-normal">{nj.name}</span>
									</Checkbox>
								</li>
							{/each}

							<footer slot="footer" class="p-2 m-0">
								<Button
									on:click={clearNaturezaJuridicaFilter}
									color="alternative"
									size="xs"
								>
									Limpar
								</Button>
							</footer>
						</Dropdown>
					</div>

					<div>
						<Label for="situacao-cadastral" class="flex items-center mb-2">
							<Reader class="mr-2" />
							<span>Situação Cadastral</span>
						</Label>
						<Select
							id="situacao-cadastral"
							size="sm"
							items={situacaoCadastral}
							bind:value={form.situacaoCadastral}
							placeholder=""
						/>
					</div>
				</div>

				<div class="grid grid-cols sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<div>
						<Label class="flex items-center">
							<Home class="mr-2" />
							<span>Estado (UF)</span>
						</Label>
						<div class="text-stone-500 my-2 text-xs">Selecione o estado</div>
						<Button
							color="alternative"
							size="lg"
							class="w-full flex items-center justify-between focus:ring-2 focus:ring-primary-500"
							on:click={() => {
								estadoSearch = '';
								filterEstado();
							}}
						>
							<div class="text-xs font-normal truncate">
								{form.estado.join(', ')}
							</div>
							<div class="ml-2 chevron-down flex-none" />
						</Button>
						<Dropdown
							placement="bottom"
							class="rounded overflow-y-auto p-0 flex flex-col text-sm h-44 max-w-sm"
						>
							<header slot="header" class="p-3">
								<Search
									size="md"
									bind:value={estadoSearch}
									placeholder="Nome do estado"
								/>
							</header>

							{#each estadoFilter as uf (uf.value)}
								<li class="p-3 hover:bg-gray-100">
									<Checkbox bind:checked={uf.active} on:change={onEstadoChange}>
										<span class="font-normal">{uf.name}</span>
									</Checkbox>
								</li>
							{/each}

							<footer slot="footer" class="p-2 m-0">
								<Button on:click={clearEstadoFilter} color="alternative" size="xs">
									Limpar
								</Button>
							</footer>
						</Dropdown>
					</div>

					<div>
						<Label class="flex items-center">
							<Home class="mr-2" />
							<span>Municipio</span>
						</Label>
						<div class="text-stone-500 my-2 text-xs">Selecione um municipio</div>
						<Button
							color="alternative"
							size="lg"
							class="w-full flex items-center justify-between focus:ring-2 focus:ring-primary-500"
							disabled={!form.estado.length}
							on:click={() => {
								municipioSearch = '';
								filterMunicipio();
							}}
						>
							<div class="text-xs font-normal truncate">
								{form.municipio.join(', ')}
							</div>
							<div class="ml-2 chevron-down flex-none" />
						</Button>
						<Dropdown
							placement="bottom"
							class="rounded overflow-y-auto p-0 flex flex-col text-sm h-44 max-w-sm"
						>
							<header slot="header" class="p-3">
								<Search
									size="md"
									bind:value={municipioSearch}
									placeholder="Nome do município"
								/>
							</header>

							{#each municipioFilter as municipio (municipio.value)}
								<li class="p-3 hover:bg-gray-100">
									<Checkbox
										bind:checked={municipio.active}
										on:change={onMunicipioChange}
									>
										<span class="font-normal">{municipio.name}</span>
									</Checkbox>
								</li>
							{/each}

							<footer slot="footer" class="p-2 m-0">
								<Button
									on:click={clearMunicipioFilter}
									color="alternative"
									size="xs"
								>
									Limpar
								</Button>
							</footer>
						</Dropdown>
					</div>

					<div>
						<Label for="bairro" class="flex items-center">
							<Home class="mr-2" />
							<span>Bairro</span>
						</Label>
						<div class="text-stone-500 my-2 text-xs">Digite o nome do bairro</div>
						<Input id="bairro" size="sm" placeholder="" bind:value={form.bairro} />
					</div>

					<div class="grid grid-cols md:grid-cols-2 gap-4">
						<div>
							<Label for="cep" class="flex items-center">
								<Home class="mr-2" />
								<span>CEP</span>
							</Label>
							<div class="text-stone-500 my-2 text-xs">Somente 8 dígitos</div>
							<Input id="cep" size="sm" placeholder="" bind:value={form.cep} />
						</div>

						<div>
							<Label for="ddd" class="flex items-center">
								<Mobile class="mr-2" />
								<span>DDD</span>
							</Label>
							<div class="text-stone-500 my-2 text-xs">2 dígitos</div>
							<Input id="ddd" size="sm" type="text" bind:value={form.ddd} />
						</div>
					</div>
				</div>

				<div class="grid grid-cols sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<div>
						<Label for="data-abertura-de" class="flex items-center">
							<Calendar class="mr-2" />
							<span>Data de Abertura</span>
						</Label>
						<div class="text-stone-500 my-2 text-xs">A partir de</div>
						<Input
							id="data-abertura-de"
							size="sm"
							type="date"
							bind:value={form.dataAberturaDe}
						/>
					</div>

					<div>
						<Label for="data-abertura-ate" class="flex items-center">
							<Calendar class="mr-2" />
							<span>Data de Abertura</span>
						</Label>
						<div class="text-stone-500 my-2 text-xs">Até</div>
						<Input
							id="data-abertura-ate"
							size="sm"
							type="date"
							bind:value={form.dataAberturaAte}
						/>
					</div>

					<div>
						<Label for="capital-social-de" class="flex items-center">
							<Stack class="mr-2" />
							<span>Capital Social</span>
						</Label>
						<div class="text-stone-500 my-2 text-xs">A partir de</div>
						<Input
							id="capital-social-de"
							size="sm"
							type="number"
							min="0"
							step="1"
							bind:value={form.capitalSocialDe}
						/>
					</div>

					<div>
						<Label for="capital-social-ate" class="flex items-center">
							<Layers class="mr-2" />
							<span>Capital Social</span>
						</Label>
						<div class="text-stone-500 my-2 text-xs">Até</div>
						<Input
							id="capital-social-ate"
							size="sm"
							type="number"
							min="0"
							step="1"
							bind:value={form.capitalSocialAte}
						/>
					</div>
				</div>

				<div class="grid grid-cols sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<Toggle bind:checked={form.somenteMei} size="small" class="mt-4 mx-1">
						<span class="font-normal">Somente MEI</span>
					</Toggle>
					<Toggle bind:checked={form.excluirMei} size="small" class="mt-4 mx-1">
						<span class="font-normal">Excluir MEI</span>
					</Toggle>
					<Toggle bind:checked={form.somenteMatriz} size="small" class="mt-4 mx-1">
						<span class="font-normal">Somente matriz</span>
					</Toggle>
					<Toggle bind:checked={form.somenteFilial} size="small" class="mt-4 mx-1">
						<span class="font-normal">Somente filial</span>
					</Toggle>
					<Toggle bind:checked={form.comTelefone} size="small" class="mt-4 mx-1">
						<span class="font-normal">Com contato de telefone</span>
					</Toggle>
					<Toggle bind:checked={form.somenteCelular} size="small" class="mt-4 mx-1">
						<span class="font-normal">Somente celular</span>
					</Toggle>
					<Toggle bind:checked={form.somenteFixo} size="small" class="mt-4 mx-1">
						<span class="font-normal">Somente fixo</span>
					</Toggle>
					<Toggle bind:checked={form.comEmail} size="small" class="mt-4 mx-1">
						<span class="font-normal">Com e-mail</span>
					</Toggle>
				</div>
			</div>
			<div
				class="bg-neutral-200 text-neutral-500 h-20 p-3 font-bold space-x-3 flex items-center"
			>
				{#if searchInProgress}
					<div class="w-full space-y-2">
						<div class="text-sm flex items-center space-x-3 justify-between">
							<div>{saveInProgress ? 'Salvando' : 'Pesquisando'}...</div>
							<div>{searchProgressValue}%</div>
						</div>
						<Progressbar
							animate={true}
							tweenDuration={2000}
							easing={linear}
							size="h-1"
							progress={searchProgressValue}
						/>
					</div>
				{:else}
					<Button
						size="sm"
						color="primary"
						on:click={() => search(1, config.schedule.limit)}
					>
						Salvar
					</Button>

					<Button size="sm" color="light" on:click={clearFilters}>Limpar</Button>
				{/if}
			</div>
		</section>
	</div>
</section>
