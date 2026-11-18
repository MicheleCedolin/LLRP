# Data and sources

The app ships 76 benchmark instances (file `data/instances.json` on the `gh-pages` branch) together with best known solutions (BKS). The instances were created by other researchers and are not part of this project's own work. Please cite the original sources when you use them.

## Instance sets

| Set | Instances | Source |
|---|---|---|
| Tuzun-Burke | 36 (100-200 customers, 10-20 candidate depots) | Tuzun, D., & Burke, L. I. (1999). A two-phase tabu search approach to the location routing problem. *European Journal of Operational Research*, 116(1), 87-99. |
| Prodhon | 30 (20-200 customers, 5-10 candidate depots) | Attributed to Prins et al. (2004) by Osorio-Mora et al. (2023); distributed on C. Prodhon's web page. |
| Barreto | 10 of 19 (21-134 customers, 5-14 candidate depots) | Barreto, S., Ferreira, C., Paixao, J., & Sousa Santos, B. (2007). Using clustering analysis in a capacitated location-routing problem. *European Journal of Operational Research*, 179(3), 968-977. See also Barreto (2004). The Barreto page asks users to cite the 2007 paper. |

The selection of these 76 instances as an LLRP benchmark, and the fleet size *K* and the maximum number of open depots *p* of each instance, follow Moshref-Javadi and Lee (2016), Tables 2-4:

- Moshref-Javadi, M., & Lee, C. (2016). The latency location-routing problem. *European Journal of Operational Research*, 255(2), 604-619. https://doi.org/10.1016/j.ejor.2016.05.048

## Best known solutions

BKS values are the best values recorded in the solution files published by Zou et al. (2024), https://github.com/YujiZou/LLRP. For most instances they are lower than the best values printed in the tables of the published papers. A BKS is the best value known to us, not a proof of optimality; Zou et al. report proven optima only for small instances (11 Prodhon and 6 Barreto instances).

- Zou, Y., Hao, J.-K., & Wu, Q. (2024). A reinforcement learning guided hybrid evolutionary algorithm for the latency location routing problem. *Computers & Operations Research*, 170, 106758. https://doi.org/10.1016/j.cor.2024.106758

## What the app changed

- The instances were converted to the app's own text format (`.inst`).
- Distances are real-valued Euclidean distances (not rounded).
- Instances you upload stay in your browser and are never sent to a server.

## Licence status of the data

No explicit reuse or redistribution licence was found for these files. They are included so that results can be reproduced and are credited to their authors. Any licence file in this repository covers only this project's own code and text, not the benchmark data. If you are an author of one of these sets and would like a file changed or removed, please write to contact@michelecedolin.com.
