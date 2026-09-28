"use client";
import { ResourcePage } from "@/features/resource/ResourcePage";
import { departmentsConfig } from "@/features/departments/config";
export default function Page() { return <ResourcePage cfg={departmentsConfig} />; }
