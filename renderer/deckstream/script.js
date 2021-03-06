import { ipcRenderer, remote } from 'electron'
const { Menu, MenuItem } = remote

import Vue from 'vue'
import Vuex from 'vuex'
import sharedMutations from 'vuex-shared-mutations';

import App from './components/App.vue'

import 'bootstrap/dist/css/bootstrap.min.css'
import './style.css'

import $ from 'jquery'
import Popper from 'popper.js'
import 'bootstrap'
import draggable from 'vuedraggable'

window.$ = $
$(() => $('[data-toggle="tooltip"]').tooltip())
Popper.Defaults.modifiers.computeStyle.gpuAcceleration = !(window.devicePixelRatio < 1.5 && /Win/.test(navigator.platform))

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    players: [],
    data: {}
  },
  mutations: {
    changeSource(state, payload) {
      let index = state.players.findIndex((player) => player.id === payload.id)
      state.players[index].src = ''
      state.players[index].src = payload.src
      state.players[index].loop = payload.loop
      state.players[index].pauseOnEnd = payload.pauseOnEnd
      state.players[index].enableFade = payload.enableFade
    },
    changePreviewSource(state, payload) {
      let index = state.players.findIndex((player) => player.id === payload.id)
      state.players[index].previewSrc = payload.src
    },
    updateCurrentTime(state, payload) {
      let index = state.players.findIndex((player) => player.id === payload.id)
      state.players[index].currentTime = payload.currentTime
      ipcRenderer.send('update-current-time', { index, ...payload })
    },
    updateRemainingTime(state, payload) {
      let index = state.players.findIndex((player) => player.id === payload.id)
      state.players[index].remainingTime = payload.remainingTime
      ipcRenderer.send('update-remaining-time', { index, ...payload })
    },
    addPlayer(state, payload) {
      state.players.push({ id: payload.id, src: "", loop: false, pauseOnEnd: true, enableFade: false, previewSrc: "", currentTime: null, remainingTime: null })
    },
    updateFadeDuration(state, fadeDuration) {
      state.data.fadeDuration = fadeDuration
    },
  },
  plugins: [sharedMutations({ predicate: ['changeSource', 'changePreviewSource', 'updateCurrentTime', 'updateRemainingTime', 'updateFadeDuration'] })]
})

new Vue({
  components: { App },
  store,
  template: '<App ref="app"></App>',
  methods: {
    loadData: function () {
      let data = ipcRenderer.sendSync('load-data')
      this.$store.state.data = data
    },
    buildPlayers: function () {
      const decks = this.$store.state.data.decks
      decks.forEach((deck, index) => this.$store.commit('addPlayer', { id: deck.id }))
    },
    enableEvents: function () {
      const data = this.$store.state.data

      ipcRenderer.on('get-data', (event) => ipcRenderer.send('get-data', data))
      ipcRenderer.on('get-name', (event) => ipcRenderer.send('get-name', data.name))
      ipcRenderer.on('get-activeDeck', (event) => ipcRenderer.send('get-activeDeck', data.decks[data.activeDeck]))
      ipcRenderer.on('get-activeDeckData', (event) => ipcRenderer.send('get-activeDeckData', { deck: data.decks[data.activeDeck] }))
      ipcRenderer.on('get-fadeDuration', (event) => ipcRenderer.send('get-fadeDuration', { fadeDuration: data.fadeDuration }))

      ipcRenderer.on('add-output', (event, id) => data.decks[data.activeDeck].outputs.push(id))
      ipcRenderer.on('disable-outputs', (event) => data.decks[data.activeDeck].outputs = [])

      ipcRenderer.on('update-settings', (event, argv) => {
        data.name = argv.name
        data.description = argv.description
        this.$store.commit('updateFadeDuration', argv.fadeDuration)
      })

      ipcRenderer.on('add-clip', (event, argv) => {
        data.decks[data.activeDeck].groups[argv.group].clips.push({ name: argv.name, path: argv.path, color: argv.color, posterTime: argv.posterTime, loop: argv.loop, pauseOnEnd: argv.pauseOnEnd, enableFade: argv.enableFade })
        ipcRenderer.send('update-data', data)
      })

      ipcRenderer.on('edit-clip', (event, argv) => {
        data.decks[argv.dIndex].groups[argv.gIndex].clips[argv.cIndex].name = argv.name
        data.decks[argv.dIndex].groups[argv.gIndex].clips[argv.cIndex].posterTime = argv.posterTime
        data.decks[argv.dIndex].groups[argv.gIndex].clips[argv.cIndex].color = argv.color
        data.decks[argv.dIndex].groups[argv.gIndex].clips[argv.cIndex].loop = argv.loop
        data.decks[argv.dIndex].groups[argv.gIndex].clips[argv.cIndex].pauseOnEnd = argv.pauseOnEnd
        data.decks[argv.dIndex].groups[argv.gIndex].clips[argv.cIndex].enableFade = argv.enableFade
        ipcRenderer.send('update-data', data)
      })

      ipcRenderer.on('add-deck', (event, argv) => {
        let generatedID = Math.random().toString(36).substr(2, 9)
        data.decks.splice(argv.position, 0, { id: generatedID, name: argv.name, groups: [], outputs: [] })
        this.$store.commit('addPlayer', { id: generatedID })
        ipcRenderer.send('update-data', data)
      })

      ipcRenderer.on('add-group', (event, argv) => {
        data.decks[data.activeDeck].groups.splice(argv.position, 0, { name: argv.name, clips: [] })
        ipcRenderer.send('update-data', data)
      })

      ipcRenderer.on('edit-group', (event, argv) => {
        data.decks[argv.dIndex].groups[argv.gIndex].name = argv.name
        ipcRenderer.send('update-data', data)
      })

      ipcRenderer.on('changeSource', (event, data) => {
        this.$store.commit('changeSource', data)
        ipcRenderer.send('current-live', data)
      })
    }
  },
  created() {
    this.loadData()
    this.enableEvents()
    this.buildPlayers()
  }
}).$mount('#app')