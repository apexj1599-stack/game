import { Component, createRoot, type ErrorInfo, type ReactNode } from "react";
import Game from "./components/Game";
import "./styles.css";

class AppBoundary extends Component<{children:ReactNode},{error:boolean}> {
  state={error:false};
  static getDerivedStateFromError(){return {error:true};}
  componentDidCatch(_error:Error,_info:ErrorInfo){/* keep the recovery UI visible */}
  reset=()=>{try{localStorage.removeItem("emberfall.settings.v2");}catch{};location.reload();};
  render(){
    if(!this.state.error)return this.props.children;
    return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#09070d",color:"#fff",fontFamily:"system-ui",padding:24}}>
      <section style={{maxWidth:520,textAlign:"center",padding:32,border:"1px solid #3a263d",borderRadius:20,background:"#120d17",boxShadow:"0 20px 80px #0008"}}>
        <div style={{fontSize:48}}>🔥</div><h1 style={{fontSize:32,margin:"8px 0"}}>Emberfall needs a reset</h1>
        <p style={{color:"#b9adbd",lineHeight:1.6}}>A saved setting or browser state caused the game to crash. Resetting settings will keep your progress safe.</p>
        <button onClick={this.reset} style={{marginTop:18,padding:"12px 22px",borderRadius:12,border:0,fontWeight:800,cursor:"pointer"}}>RESET SETTINGS & RELOAD</button>
      </section>
    </main>;
  }
}

const root=document.getElementById("root");
if(!root)throw new Error("Emberfall root element was not found.");
createRoot(root).render(<AppBoundary><Game/></AppBoundary>);
