import { createFileRoute } from "@tanstack/react-router";
import Game from "@/components/Game";

export const Route=createFileRoute("/")({ssr:false,head:()=>({meta:[{title:"Emberfall — Arena Survival"},{name:"description",content:"A fast, funny, escalating arena survival game for solo or local co-op."}]}),component:Game});
