"use client";

import { Cpu, Droplets, Lightbulb } from "lucide-react";
import { ToggleSwitch } from "@/components/shared/ToggleSwitch";
import { StatusDot } from "@/components/shared/index";
import { useAppStore } from "@/lib/store";
import { apiUpdateDevice, apiSendDeviceCommand } from "@/lib/api/client";

const deviceTypeConfig: Record<string, { icon: typeof Cpu; color: string }> = {
  pump: { icon: Droplets, color: "#2980B9" },
  led_rgb: { icon: Lightbulb, color: "#F39C12" },
  sensor_temp: { icon: Cpu, color: "#5C7A6A" },
  sensor_humidity_air: { icon: Cpu, color: "#5C7A6A" },
  sensor_humidity_soil: { icon: Cpu, color: "#5C7A6A" },
  sensor_light: { icon: Cpu, color: "#5C7A6A" },
};

export function DeviceQuickControl() {
  const devices = useAppStore((s) => s.devices);
  const gardens = useAppStore((s) => s.gardens);
  const currentFarmId = useAppStore((s) => s.currentFarmId);
  const toggleDevice = useAppStore((s) => s.toggleDevice);
  const addToast = useAppStore((s) => s.addToast);
  const loggedInUser = useAppStore((s) => s.loggedInUser);

  const farmGardenIds = new Set(
    gardens
      .filter((garden) => !currentFarmId || garden.farmId === currentFarmId)
      .map((garden) => garden.id)
  );

  const controllable = devices.filter(
    (d) => (d.type === "pump" || d.type === "led_rgb") && farmGardenIds.has(d.gardenId)
  );

  const getGardenColor = (gardenId: string) =>
    gardens.find((g) => g.id === gardenId)?.color ?? "#5C7A6A";

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-[1.0625rem] text-[#1A2E1F] mb-4">Điều khiển nhanh</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {controllable.map((device) => {
          const config = deviceTypeConfig[device.type] ?? deviceTypeConfig.pump;
          const Icon = config.icon;
          const gardenColor = getGardenColor(device.gardenId);

          return (
            <div
              key={device.id}
              className="flex-shrink-0 w-[168px] bg-[#F7F8F6] border border-[#E2E8E4] rounded-[10px] p-3.5 border-l-4"
              style={{ borderLeftColor: gardenColor }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-[8px] flex items-center justify-center"
                  style={{ backgroundColor: config.color + "18" }}
                >
                  <Icon size={20} strokeWidth={1.5} style={{ color: config.color }} />
                </div>
                <StatusDot status={device.status} />
              </div>
              <p className="text-[0.8125rem] font-semibold text-[#1A2E1F] leading-tight mb-0.5">{device.name}</p>
              <p className="text-[0.6875rem] text-[#5C7A6A] mb-3">{device.gardenName}</p>
              <div className="flex items-center justify-between">
                <span className="text-[0.6875rem] font-bold" style={{ color: device.isOn ? "#27AE60" : "#5C7A6A" }}>
                  {device.isOn ? "Đang bật" : "Đã tắt"}
                </span>
                <ToggleSwitch
                  checked={device.isOn}
                  onChange={async () => {
                    const cmd = device.isOn ? "turn_off" : "turn_on";
                    try {
                      await apiUpdateDevice(device.id, undefined, device.isOn ? "online" : "active");
                      await apiSendDeviceCommand(device.id, cmd, {}, loggedInUser?.id);
                    } catch {}
                    toggleDevice(device.id);
                    addToast({
                      type: "success",
                      message: `${device.isOn ? "Đã tắt" : "Đã bật"} ${device.name}`,
                    });
                  }}
                  size="sm"
                  disabled={device.status !== "online" && device.status !== "active"}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
