<template>
  <div class="align-self-center col-6 text-center text-danger remaining-time">{{ getRemainingTime }}</div>
</template>

<script>
export default {
  props: ["index", "preview"],
  computed: {
    getRemainingTime() {
      const data = this.$store.state.videos[this.index]
      if (!data) return null
      if (data.remainingTime < 40) data.flashTime = true;
      if (data.remainingTime < 20) data.flashDanger = true;

      return this.toHHMMSS(data.remainingTime)
    }
  },
  methods: {
    toHHMMSS: function (time) {
      var sec_num = parseInt(time, 10);
      var hours = Math.floor(sec_num / 3600);
      var minutes = Math.floor((sec_num - hours * 3600) / 60);
      var seconds = sec_num - hours * 3600 - minutes * 60;

      if (hours < 10) hours = "0" + hours;
      if (minutes < 10) minutes = "0" + minutes;
      if (seconds < 10) seconds = "0" + seconds;
      return hours + ":" + minutes + ":" + seconds;
    }
  }
};
</script>

<style>
.remaining-time {
  font-size: 25px;
  padding: 10px 0px 5px;
}
</style>
