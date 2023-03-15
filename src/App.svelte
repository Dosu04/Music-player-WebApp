<script>
    import {onMount} from "svelte";
    import {musicList} from "./musiclist.js";

    let currentSongIndex = 0;
    let playerState = "play";
    let audioElement;
    let mainElement;

    function setBackground() {
        let background = `
            linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.5)),
            url(./files/image/${$musicList[currentSongIndex].image}) center no-repeat
        `;
        mainElement.style.background = background;
        mainElement.style.backgroundSize = "cover";

    }

    onMount(function(){
        setBackground();
    })

    function prev(){
        if(currentSongIndex==0){
          currentSongIndex = $musicList.length - 1;  
        } else{
            currentSongIndex = (currentSongIndex - 1) % $musicList.length;
        }
        playerState = "play";
        setBackground();

    }

    function playpause(){
        if(playerState == "play"){
            playerState = "pause";
            audioElement.pause();
        } else{
            playerState = "play";
            audioElement.play();


        }
    }

    function next(){
         currentSongIndex = (currentSongIndex + 1) % $musicList.length;
         playerState = "play";
        setBackground();

    }

    function setSong(i){
        currentSongIndex = i;
        playerState = "play";
        setBackground();

    }
</script>
<style>
    /* Player Styles */
.player {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 30px;
  background-color: #fff;
  box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  color: #444;
}

.current-song {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 30px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 20px;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-controls {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

h2 {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  margin-bottom: 5px;
  text-align: center;
}

.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
}

button {
  background-color: transparent;
  border: none;
  outline: none;
  font-size: 24px;
  color: #444;
  margin: 0 10px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

button:hover {
  transform: scale(1.2);
  color: #111;
}

button i {
  font-size: 24px;
}

.active {
  background-color: #e9e9e9;
}

.song-list {
  width: 100%;
  overflow-y: scroll;
  height: 300px;
  margin-top: 30px;
}

.song-details {
  display: flex;
  flex-direction: column;
}

.song-details h2 {
  font-size: 16px;
  font-weight: bold;
  margin: 0;
  margin-bottom: 5px;
}

.song-details p {
  font-size: 14px;
  margin: 0;
}
header {
  background-color: #222;
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
}

h1 {
  font-size: 36px;
  margin: 0;
}

p {
  font-size: 16px;
  margin: 0 0 0 10px;
}
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: #333;
  color: white;
  text-align: center;
  padding: 10px;
  font-size: 20px;
  font-family: Arial, sans-serif;
}
  
a {
    color:#ff3e00;
    text-decoration: none;

}
a:hover {
    font-weight: 700;
    font-size: 1.5rem;
}
</style>
<header>
    <h1>DOSU</h1>
    <p>Music Player</p>
  </header>
<main bind:this={mainElement}>
    <audio 
        src={"./files/audio/"+$musicList[currentSongIndex].audio}
        bind:this={audioElement}
        autoplay="false"    
    >
    </audio>   
    <div class="player">
        <div class="current-song">
            <div class="avatar">
                <img src={"./files/image/"+$musicList[currentSongIndex].image} alt="">
            </div>
            <div class="song-controls">
                <h2>
                    {$musicList[currentSongIndex].name}
                </h2>
                <div class="controls">
                    <button on:click={prev}>
                        <i class="fa fa-backward"></i>
                    </button>
                    <button on:click={playpause}>
                        {#if playerState == "play"}
                            <i class="fa fa-pause"></i>
                        {:else}
                            <i class="fa fa-play"></i>
                        {/if}
                    </button>
                    <button on:click={next}>
                        <i class="fa fa-forward"></i>
                    </button>
                </div>
            </div>
        </div>   
        <div class="song-list">
            {#each $musicList as music, i}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore missing-declaration -->
                <div 
                    class="{i==currentSongIndex ? "active":""}"
                    on:click="{()=>setSong(i)}"
                >
                    <div class="avatar">
                        <img src={"./files/image/"+music.image} alt="">
                    </div>
                    <div class="song-details">
                        <h2>{music.name}</h2>
                        <p>{music.artist}</p>
                    </div>

                </div>
            {/each}
        </div>
    </div>     

</main>
<footer class="footer">
    Made with <a href="https://svelte.dev/">Svelte.js</a> <img width="25px" src="https://th.bing.com/th/id/R.02f9ec2d33cc2727b182b07e53a35773?rik=sB8nh4ElbxLn7g&pid=ImgRaw&r=0" alt=""> by <a href="https://emmanueloladosu.com/">Emmanuel Oladosu</a> 
  </footer>

