/**
 * Initial router definitions.
 * Each router can later be managed individually (IP, name, position, status…).
 */
export const INITIAL_ROUTERS = {
  A: {
    id: "A",
    name: "Router A",
    ip: "192.168.1.1",
    prefix: 24,           // subnet prefix length (CIDR)
    x: 170,
    y: 150,
    status: "online",     // online | offline | error
    interface: "ETH0",
  },
  B: {
    id: "B",
    name: "Router B",
    ip: "192.168.1.2",
    prefix: 24,
    x: 510,
    y: 150,
    status: "online",
    interface: "ETH0",
  },
};

export const LINK_AB = {
  from: "A",
  to: "B",
  label: "ETH0 ─── ETH0",
  bandwidth: "1 Gbps",
};
