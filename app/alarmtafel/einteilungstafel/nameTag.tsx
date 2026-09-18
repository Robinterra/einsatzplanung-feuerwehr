export type MemberTag = {
	id: string;
	name: string;
    trainings: string;
};

export const NAME_TAG_WIDTH = 375;

type NameTagProps = {
	member: MemberTag;
};

export function NameTag({ member }: NameTagProps) {
	return (
		<div
			style={{
				border: "1px solid #222",
				borderRadius: 4,
				padding: "0.5rem 0.75rem",
				background: "#fff",
				color: "#222",
				width: "100%",
				boxSizing: "border-box",
				minHeight: 60,
				overflowWrap: "anywhere",
			}}
		>
			<strong>{member.name}</strong>
			<div style={{ fontSize: "0.8rem", color: "#666" }}>{member.trainings}</div>
		</div>
	);
}

type NameTagsProps = {
	members: MemberTag[];
};

export function NameTags({ members }: NameTagsProps) {
	const uniqueMembers = Array.from(
		new Map(members.map((member) => [member.id, member])).values(),
	);

	return (
		<>
			{uniqueMembers.map((member) => (<NameTag key={member.id} member={member}/>
))}
		</>
	);
}

